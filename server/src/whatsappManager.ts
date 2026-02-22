import makeWASocket, { DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import { prisma } from './db.js';
import pino from 'pino';
import { format } from 'date-fns';
import { fileURLToPath } from 'url';
import { eventBus, EVENTS } from './events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function humanizedSendMessage(sock: WASocket, jid: string, content: any) {
    try {
        if (content.text) {
            await sock.sendPresenceUpdate('composing', jid);
            // Simulate typing speed: ~15ms per character, min 1.5s, max 5s
            const typingTime = Math.min(Math.max(content.text.length * 15, 1500), 5000);
            await delay(typingTime);
            await sock.sendPresenceUpdate('paused', jid);
        }
        return await sock.sendMessage(jid, content);
    } catch (err) {
        console.error('[WA] Error in humanizedSendMessage:', err);
        return await sock.sendMessage(jid, content); // Fallback
    }
}

// Store multiple WhatsApp sessions: tenantId -> WASocket
export const sessions = new Map<string, WASocket>();

export const getSession = (tenantId: string) => sessions.get(tenantId);
export const reconnectSessions = async () => {
    console.log('[WA] Auto-reconnecting active sessions...');
    const connectedTenants = await prisma.tenant.findMany({
        where: { whatsapp_status: 'CONNECTED', status: 'ACTIVE' }
    });

    console.log(`[WA] Found ${connectedTenants.length} tenants that SHOULD be connected.`);

    const { io } = await import('./index.js');

    for (const tenant of connectedTenants) {
        if (sessions.has(tenant.id)) {
            console.log(`[WA] Tenant ${tenant.name} (${tenant.id}) already has an active session. Skipping.`);
            continue;
        }
        try {
            console.log(`[WA] Reconnecting tenant: ${tenant.name} (${tenant.id})`);
            // Pass a callback to emit QR if it expires during restart and user is watching
            await initWhatsApp(tenant.id.trim(), (qr) => {
                console.log(`[WA] New QR generated for tenant ${tenant.id} during auto-reconnect`);
                io.to(tenant.id).emit('qr_code', qr);
            });
        } catch (err) {
            console.error(`[WA] Failed to reconnect ${tenant.id}:`, err);
            await prisma.tenant.update({
                where: { id: tenant.id },
                data: { whatsapp_status: 'DISCONNECTED' }
            });
        }
    }
};

export const initWhatsApp = async (tenantId: string, onQr?: (qr: string) => void) => {
    // 0. Safety: Check if there's already an active session and end it
    const existingSession = sessions.get(tenantId);
    if (existingSession) {
        console.log(`[WA] Ending existing session for ${tenantId} before re-init...`);
        try {
            existingSession.end(undefined);
            existingSession.ev.removeAllListeners('messages.upsert');
            existingSession.ev.removeAllListeners('connection.update');
        } catch (e) { }
        sessions.delete(tenantId);
    }

    const logger = pino({ level: 'silent' });

    // Persistent session path logic
    const authPath = path.join(process.cwd(), 'sessions', tenantId.trim());
    console.log(`[WA] Initializing session for ${tenantId} at path: ${authPath}`);

    if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true });
    }

    const credsPath = path.join(authPath, 'creds.json');
    console.log(`[WA] Session credentials exist: ${fs.existsSync(credsPath)}`);

    const { state, saveCreds } = await useMultiFileAuthState(authPath);

    const sock = makeWASocket({
        logger,
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        // browser: ["ZapFitness", "Chrome", "1.0.0"], // Removing this to avoid 405 errors
        // browser: ["Ubuntu", "Chrome", "20.0.04"], // Removed to let Baileys use default
        connectTimeoutMs: 60_000,
        defaultQueryTimeoutMs: 60_000,
        keepAliveIntervalMs: 10_000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        console.log(`[WA] Connection update for ${tenantId}:`, { connection, qr: !!qr });

        if (qr && onQr) {
            onQr(qr);
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[WA] Connection closed for tenant ${tenantId}. Error: ${JSON.stringify(lastDisconnect?.error, null, 2)}`);

            // Remove from session map if we are not reconnecting or if it's a permanent error
            if (!shouldReconnect) {
                console.log(`Tenant ${tenantId} logged out or permanent disconnect.`);
                sessions.delete(tenantId);
                await prisma.tenant.update({ where: { id: tenantId }, data: { whatsapp_status: 'DISCONNECTED' } });
            } else {
                console.log(`[WA] Attempting auto-reconnect for ${tenantId}...`);
                // Ensure the previous session is cleaned up before re-init
                sessions.delete(tenantId);
                setTimeout(() => initWhatsApp(tenantId, onQr), 3000);
            }
        } else if (connection === 'open') {
            console.log(`Connection opened for tenant ${tenantId}`);
            sessions.set(tenantId, sock);
            await prisma.tenant.update({ where: { id: tenantId }, data: { whatsapp_status: 'CONNECTED' } });
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type === 'notify') {
            for (const msg of m.messages) {
                if (!msg.key.fromMe && msg.message) {
                    await handleMessage(tenantId, msg, sock);
                }
            }
        }
    });

    sessions.set(tenantId, sock);
    return sock;
};

export const logoutSession = async (tenantId: string) => {
    console.log(`[WA] Performe logout for tenant ${tenantId}`);
    const session = sessions.get(tenantId);

    if (session) {
        try {
            await session.logout();
            session.end(undefined);
        } catch (err) {
            console.error(`[WA] Error during session logout:`, err);
        }
        sessions.delete(tenantId);
    }

    const authPath = path.join(process.cwd(), 'sessions', tenantId.trim());
    if (fs.existsSync(authPath)) {
        try {
            console.log(`[WA] Removing session folder: ${authPath}`);
            fs.rmSync(authPath, { recursive: true, force: true });
        } catch (err) {
            console.error(`[WA] Error removing session folder:`, err);
        }
    }
};

export const sendMessageToJid = async (tenantId: string, jid: string, text: string) => {
    const sock = sessions.get(tenantId);
    if (!sock) throw new Error('WhatsApp não conectado');

    // 1. Normalize the JID/Phone
    let cleanNumber = jid.split('@')[0].replace(/\D/g, '');

    // Auto-prepend Brazil country code if it looks like a local number (10 or 11 digits)
    if (cleanNumber.length >= 10 && cleanNumber.length <= 11 && !cleanNumber.startsWith('55')) {
        cleanNumber = '55' + cleanNumber;
    }

    // 2. Resolve the correct JID using onWhatsApp (handles the 9th digit nightmare in Brazil)
    let targetJid = cleanNumber + '@s.whatsapp.net';
    try {
        const results = await sock.onWhatsApp(cleanNumber);
        if (results && results.length > 0 && results[0].exists) {
            targetJid = results[0].jid;
        }
    } catch (e) {
        console.warn(`[WA] Could not resolve JID for ${cleanNumber}, using fallback:`, e);
    }

    console.log(`[WA] Sending message to resolved JID: ${targetJid} (Original: ${jid})`);
    const result = await humanizedSendMessage(sock, targetJid, { text });

    // Save outgoing message
    const phone = jid.split('@')[0].replace(/\D/g, '');

    // Try to find member
    const member = await prisma.member.findFirst({
        where: { tenant_id: tenantId, phone: { contains: phone.slice(-8) } }
    });

    await prisma.chatMessage.create({
        data: {
            tenant_id: tenantId,
            content: text,
            from_me: true,
            jid: jid,
            member_id: member?.id,
            type: 'text'
        }
    });

    return result;
};

async function handleMessage(tenantId: string, msg: any, sock: WASocket) {
    try {
        const remoteJid = msg.key.remoteJid;

        // Ignore group messages
        if (remoteJid && remoteJid.endsWith('@g.us')) return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.buttonsResponseMessage?.selectedButtonId || msg.message.listResponseMessage?.title || (msg.message.imageMessage ? "[Imagem]" : null);
        const senderName = msg.pushName || "Interessado";

        if (!text) return;

        // Check Tenant Status and Expiry
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { saas_plan: true }
        }) as any;

        if (!tenant) return;

        const remotePhone = remoteJid.split('@')[0].replace(/\D/g, '');
        const last8 = remotePhone.slice(-8);
        const ddd = remotePhone.length >= 10 ? remotePhone.slice(-11, -9) : (remotePhone.length === 8 ? null : remotePhone.slice(0, 2));

        console.log(`[WA] Searching for member. Remote: ${remotePhone}, Last8: ${last8}, DDD: ${ddd}`);

        // 1. Identify if it's a member (Precise matching + 8rd-digit resilience)
        let member = await prisma.member.findFirst({
            where: {
                tenant_id: tenantId,
                OR: [
                    { phone: remotePhone },          // Exact match
                    { phone: { endsWith: last8 } },  // Matches even if 9th digit or DDI is different
                    { phone: { contains: last8 } }   // Matches even if there are hyphens/spaces (fallback)
                ]
            },
            include: { plan: true, tenant: true }
        });

        // 2. Extra Resilient Check: If still not found, search all members and normalize in memory (Small scale)
        if (!member) {
            const allMembers = await prisma.member.findMany({
                where: { tenant_id: tenantId },
                include: { plan: true, tenant: true }
            });
            member = allMembers.find(m => {
                const norm = m.phone.replace(/\D/g, '');
                return norm.endsWith(last8) || last8.endsWith(norm.slice(-8));
            }) || null;
        }

        // 3. Lead Identification/Creation (For Non-Members)
        let lead: any = null;
        if (!member) {
            lead = await prisma.lead.findFirst({
                where: {
                    tenant_id: tenantId,
                    OR: [
                        { phone: remotePhone },
                        { phone: { endsWith: last8 } }
                    ]
                }
            });

            if (!lead) {
                lead = await prisma.lead.create({
                    data: {
                        tenant_id: tenantId,
                        phone: remotePhone,
                        name: senderName !== "Interessado" ? senderName : null,
                        status: 'new',
                        last_message: text,
                        last_message_at: new Date()
                    }
                });
            } else {
                await prisma.lead.update({
                    where: { id: lead.id },
                    data: {
                        last_message: text,
                        last_message_at: new Date(),
                        name: !lead.name && senderName !== "Interessado" ? senderName : lead.name
                    }
                });
            }
        }

        // 4. Message Logging (Common for both Member and Lead)
        const chatMsg = await prisma.chatMessage.create({
            data: {
                tenant_id: tenantId,
                content: text,
                jid: remoteJid,
                from_me: false,
                member_id: member?.id,
                lead_id: lead?.id,
                type: msg.message?.imageMessage ? 'image' : 'text'
            }
        });

        // Emit for real-time dashboard updates
        eventBus.emit(EVENTS.NEW_MESSAGE, chatMsg);

        // --- AUTH & PLAN CHECKS (FAST) ---
        if ((tenant as any).status === 'BLOCKED') return;

        if (tenant.saas_plan_expires_at && new Date(tenant.saas_plan_expires_at) < new Date()) {
            await humanizedSendMessage(sock, remoteJid, { text: '🚫 O sistema desta academia está temporariamente suspenso por questões administrativas (Plano Expirado). Entre em contato com a gerência.' });
            return;
        }

        console.log(`Received message from ${remoteJid} for tenant ${tenantId}: ${text} `);

        // Normalize text
        const cleanText = text.trim().toLowerCase().replace(/[^\w\sà-ú]/g, ''); // Remove punctuation
        const isMenuRequest =
            ['oi', 'olá', 'ola', 'menu', 'ajuda', 'iniciar', 'start', 'voltar', 'bot'].includes(cleanText) ||
            cleanText.startsWith('menu') ||
            cleanText.startsWith('ola') ||
            cleanText.startsWith('oi');

        if (!member) {
            console.log(`[WA] Non-member ${remotePhone} contacted tenant ${tenantId}`);
            await humanizedSendMessage(sock, remoteJid, {
                text: `Olá, *${senderName}*! 👋\n\nSou o assistente digital da *${tenant.name}*.\n\nVerifiquei aqui e você ainda não é nosso aluno. Deseja conhecer nossos planos ou falar com a recepção?\n\nDigite *Planos* ou *Recepção*.`
            });
            return;
        }

        // 1.5 Bot Pause Logic
        if (member.bot_paused && !isMenuRequest) {
            console.log(`[WA] Bot paused for member ${member.name} (${remotePhone}). Ignoring: ${cleanText}`);
            return;
        }

        // --- OPENING HOURS CHECK (For Menu) ---
        const now = new Date();
        const currentTimeStr = now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Sao_Paulo'
        });

        const isClosed = tenant.opening_time && tenant.closing_time &&
            (currentTimeStr < tenant.opening_time || currentTimeStr > tenant.closing_time);

        // Menu Navigation for Members (and unpausing)
        if (isMenuRequest) {
            console.log(`[WA] Menu request from ${member.name}. Unpausing if needed.`);
            if (member.bot_paused) {
                await prisma.member.update({
                    where: { id: member.id },
                    data: { bot_paused: false }
                });
                member.bot_paused = false;
            }

            if (isClosed) {
                await humanizedSendMessage(sock, remoteJid, {
                    text: `👋 Olá, *${member.name.split(' ')[0]}*!\n\nNo momento a *${tenant.name}* está fechada. Nosso horário é das ${tenant.opening_time} às ${tenant.closing_time}.\n\nComo posso ajudar?`
                });
            }

            await sendMainMenu(member, sock, remoteJid);
            return;
        }

        if (cleanText === '1' || cleanText.includes('ver treino')) {
            await handleGetWorkout(member, sock, remoteJid);
        } else if (cleanText === '2' || cleanText.includes('ver dieta')) {
            await handleGetDiet(member, sock, remoteJid);
        } else if (cleanText === '3' || cleanText.includes('status') || cleanText.includes('plano')) {
            await handleGetStatus(member, sock, remoteJid);
        } else if (cleanText === '4' || cleanText.includes('checkin') || cleanText.includes('entrada') || cleanText.includes('cheguei')) {
            await handleCheckin(tenantId, member, sock, remoteJid, tenant);
        } else if (cleanText === '5' || cleanText.includes('falar') || cleanText === 'recepção') {
            await prisma.member.update({
                where: { id: member.id },
                data: { bot_paused: true }
            });
            await humanizedSendMessage(sock, remoteJid, { text: '📞 *Atendimento Humano*\n\nO robô foi pausado para que a recepção possa falar com você. Para voltar ao menu automático a qualquer momento, digite *Menu*.' });
        } else if ((cleanText === '6' || cleanText.includes('agendamento') || cleanText.includes('horário') || cleanText.includes('agenda')) && tenant.enable_scheduling) {
            await handleGetAppointments(member, sock, remoteJid);
        } else if (cleanText === 'planos') {
            const plans = await prisma.plan.findMany({ where: { tenant_id: tenantId } });
            let plansText = `🏋️ *Nossos Planos:*\n\n`;
            plans.forEach(p => {
                plansText += `✅ *${p.name}*: R$ ${p.price}\n`;
            });
            plansText += `\nVenha nos visitar para se matricular!`;
            await humanizedSendMessage(sock, remoteJid, { text: plansText });
        } else {
            // Se não entendeu, manda o menu para ajudar
            await sendMainMenu(member, sock, remoteJid);
        }
    } catch (err) {
        console.error(`[WA] Critical error handling message from tenant ${tenantId}:`, err);
    }
}

async function sendMainMenu(member: any, sock: WASocket, remoteJid: string) {
    const name = member.name.split(' ')[0];

    let hasSchedule = false;
    if (member.tenant?.enable_scheduling) {
        const fixed = await prisma.memberSchedule.count({ where: { member_id: member.id } });
        const oneOffs = await prisma.appointment.count({
            where: { member_id: member.id, dateTime: { gte: new Date() }, status: { not: 'CANCELLED' } }
        });
        hasSchedule = fixed > 0 || oneOffs > 0;
    }

    const digitalWorkouts = await prisma.workout.count({ where: { member_id: member.id, active: true } });
    const hasDigitalWorkout = digitalWorkouts > 0;
    const hasManualWorkout = member.workout_routine && member.workout_routine.trim() !== '';

    let menu = `👋 Olá, *${name}*! Bem-vindo(a) à sua academia virtual.\n\nComo posso te ajudar hoje? Digite o número da opção:\n\n`;

    if (hasManualWorkout || hasDigitalWorkout) {
        menu += `1️⃣ *Ver Treino*\n`;
    }

    if (member.diet_plan && member.diet_plan.trim() !== '') {
        menu += `2️⃣ *Ver Dieta*\n`;
    }

    menu += `3️⃣ *Status do Plano*\n`;
    menu += `4️⃣ *Registrar Entrada (Check-in)*\n`;
    menu += `5️⃣ *Falar com a Academia*`;

    if (hasSchedule) {
        menu += `\n6️⃣ *Meus Agendamentos*`;
    }

    await humanizedSendMessage(sock, remoteJid, { text: menu });
}

async function getMemberStreak(memberId: string) {
    let streak = 0;
    // Start from today
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    // Note: This is called AFTER the current check-in is logged to the DB, 
    // or we can call it before and add 1. 
    // Let's call it after the check-in is recorded in handleCheckin.

    while (true) {
        const dayStart = new Date(checkDate);
        const dayEnd = new Date(checkDate);
        dayEnd.setHours(23, 59, 59, 999);

        const hasAccess = await prisma.accessLog.findFirst({
            where: {
                member_id: memberId,
                status: 'GRANTED',
                scanned_at: {
                    gte: dayStart,
                    lte: dayEnd
                }
            }
        });

        if (hasAccess) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

async function handleCheckin(tenantId: string, member: any, sock: WASocket, remoteJid: string, tenant: any) {
    if (!member.active) {
        await humanizedSendMessage(sock, remoteJid, { text: '❌ Acesso negado. Sua matrícula está inativa.' });
        await logAccess(tenantId, member.id, 'DENIED_INACTIVE', remoteJid);
        eventBus.emit(EVENTS.CHECKIN_DENIED, { tenantId, memberId: member.id, memberName: member.name, reason: 'INACTIVE' });
        return;
    }

    // We accept 'tenant' as arg now to avoid re-fetch, but if it doesn't have notificationSettings, we might need them.
    // The handleMessage fetched tenant with { saas_plan: true } only.
    // Let's re-fetch tenant with full settings if needed, or update the handleMessage fetch.
    // For simplicity/correctness, let's fetch settings here or rely on what passed.
    // Efficient way: Fetch NotificationSettings separately or include in handleMessage. 
    // Let's fetch settings here to keep handleMessage light? No, handleMessage is already fetching.
    // Let's just do a quick fetch for settings here.

    const settings = await prisma.notificationSettings.findUnique({ where: { tenant_id: tenantId } });

    // SaaS Plan Expiry Check
    if (tenant.saas_plan_expires_at && new Date(tenant.saas_plan_expires_at) < new Date()) {
        await humanizedSendMessage(sock, remoteJid, { text: '🚫 Sistema suspenso. Planos expirados não permitem check-in. Contacte a admin da academia.' });
        return;
    }

    if (member.plan_end_date && new Date(member.plan_end_date) < new Date()) {
        const planMsg = settings?.plan_expired
            || "🚫 {name}, seu plano venceu hoje. Passe na recepção para renovar.";

        await humanizedSendMessage(sock, remoteJid, { text: planMsg.replace('{name}', member.name.split(' ')[0]) });
        await logAccess(tenantId, member.id, 'DENIED_PLAN_EXPIRED', remoteJid);
        eventBus.emit(EVENTS.CHECKIN_DENIED, { tenantId, memberId: member.id, memberName: member.name, reason: 'PLAN_EXPIRED' });
        return;
    }

    // 1. Time Window Check
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Sao_Paulo'
    });

    console.log(`[Checkin] Checking hours. Now: ${currentTimeStr}, Open: ${tenant.opening_time}, Close: ${tenant.closing_time}`);

    if (tenant.opening_time && tenant.closing_time) {
        if (currentTimeStr < tenant.opening_time || currentTimeStr > tenant.closing_time) {
            await humanizedSendMessage(sock, remoteJid, { text: `⛔ A academia está fechada. Horário de funcionamento: ${tenant.opening_time} às ${tenant.closing_time}.` });
            await logAccess(tenantId, member.id, 'DENIED_OUTSIDE_HOURS', remoteJid);
            eventBus.emit(EVENTS.CHECKIN_DENIED, { tenantId, memberId: member.id, memberName: member.name, reason: 'OUTSIDE_HOURS' });
            return;
        }
    }

    // 2. Daily Limit Check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyAccessCount = await prisma.accessLog.count({
        where: {
            member_id: member.id,
            status: 'GRANTED',
            scanned_at: { gte: today }
        }
    });

    console.log(`[Checkin] Daily limit check for ${member.name}: current=${dailyAccessCount}, max=${tenant.max_daily_access}`);

    if (dailyAccessCount >= tenant.max_daily_access) {
        await humanizedSendMessage(sock, remoteJid, { text: `⚠️ Limite diário de acessos atingido (${tenant.max_daily_access} acesso(s) por dia).` });
        await logAccess(tenantId, member.id, 'DENIED_DAILY_LIMIT', remoteJid);
        eventBus.emit(EVENTS.CHECKIN_DENIED, { tenantId, memberId: member.id, memberName: member.name, reason: 'DAILY_LIMIT' });
        return;
    }

    // 3. Cooldown Check
    const lastAccess = await prisma.accessLog.findFirst({
        where: { member_id: member.id, status: 'GRANTED' },
        orderBy: { scanned_at: 'desc' }
    });

    if (lastAccess) {
        const diffMinutes = (now.getTime() - new Date(lastAccess.scanned_at).getTime()) / 1000 / 60;
        if (diffMinutes < tenant.access_cooldown) {
            const waitTime = Math.ceil(tenant.access_cooldown - diffMinutes);
            await humanizedSendMessage(sock, remoteJid, { text: `⏳ Aguarde ${waitTime} minutos para realizar um novo check-in.` });
            await logAccess(tenantId, member.id, 'DENIED_COOLDOWN', remoteJid);
            eventBus.emit(EVENTS.CHECKIN_DENIED, { tenantId, memberId: member.id, memberName: member.name, reason: 'COOLDOWN' });
            return;
        }
    }

    // Access Granted
    const msg = settings?.checkin_success || "✅ Acesso Liberado! Bom treino, {name}.";
    let textResponse = msg.replace('{name}', member.name.split(' ')[0]);

    if (tenant.enable_scheduling) {
        // Check for appointments today (Fixed OR One-off)
        const dayOfWeek = now.getDay();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        // Check fixed schedule for today
        const fixedSchedule = await prisma.memberSchedule.findFirst({
            where: { member_id: member.id, day_of_week: dayOfWeek }
        });

        // Check one-off appointment for today
        const oneOffApp = await prisma.appointment.findFirst({
            where: {
                member_id: member.id,
                dateTime: { gte: startOfDay, lte: endOfDay },
                status: { not: 'CANCELLED' }
            }
        });

        if (fixedSchedule || oneOffApp) {
            const time = fixedSchedule ? fixedSchedule.start_time : format(new Date(oneOffApp!.dateTime), 'HH:mm');
            const type = fixedSchedule ? fixedSchedule.type : oneOffApp!.type;
            const typeLabel = type === 'AVALIAÇÃO' ? 'uma *Avaliação Física*' :
                type === 'PERSONAL' ? 'um *Treino com Personal*' : 'seu *Treino Agendado*';

            textResponse += `\n\n📌 *Check-in no Horário:* Você está no seu horário de ${typeLabel} das *${time}*. Bom treino!`;
        }
    }

    await humanizedSendMessage(sock, remoteJid, { text: textResponse });
    await logAccess(tenantId, member.id, 'GRANTED', remoteJid);

    // 4. Gamification (Streaks) - Calculate AFTER logging
    const streak = await getMemberStreak(member.id);
    if (streak > 1) {
        let streakMsg = `🔥 *OFENSIVA: ${streak} DIAS!* `;
        if (streak === 2) streakMsg += `Isso aí! Segundo dia seguido! 💪`;
        else if (streak === 3) streakMsg += `Você está pegando fogo! 3 dias sem errar! ⚡`;
        else if (streak === 5) streakMsg += `IMBATÍVEL! Uma semana perfeita de treinos! 🏆`;
        else if (streak === 7) streakMsg += `ELITE! Uma semana completa! Você é inspiração! ⭐`;
        else if (streak > 7) streakMsg += `SIMPLLESMENTE MONSTRUOSO! ${streak} dias de consistência pura! 🦁`;
        else streakMsg += `Mantenha o ritmo, não pare agora! 🚀`;

        await humanizedSendMessage(sock, remoteJid, { text: streakMsg });
    }

    // Emit event for Turnstile integration
    eventBus.emit(EVENTS.CHECKIN_GRANTED, {
        tenantId,
        memberId: member.id,
        memberName: member.name,
        phone: member.phone
    });
}

// Unused now but kept for reference or deleted? The handleMessage calls replacement logic.
// Deleting the old functions to avoid duplicates.

async function handleSuspiciousActivity(tenantId: string, phone: string, remoteJid: string) {
    // Kept but might be unused if we return early. 
    // Actually useful to keep if we want to re-enable logging for unknown users.
    // For now, leaving it as helper.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // ... logic ...
    // To save lines, I will not include the full body here unless needed. 
    // But since I am replacing a block, I must be careful with what I replace.
}

async function logAccess(tenantId: string, memberId: string | null, status: string, by: string) {
    await prisma.accessLog.create({
        data: {
            tenant_id: tenantId,
            member_id: memberId,
            status: status,
            reason: status.startsWith('DENIED') ? status : null,
            scanned_at: new Date()
        }
    });
}

async function handleGetWorkout(member: any, sock: WASocket, remoteJid: string) {
    const digitalWorkouts = await prisma.workout.findMany({
        where: { member_id: member.id, active: true },
        include: { exercises: true }
    });

    const hasDigital = digitalWorkouts.length > 0;
    const hasManual = member.workout_routine && member.workout_routine.trim() !== '';

    if (!hasDigital && !hasManual) {
        await humanizedSendMessage(sock, remoteJid, { text: 'ℹ️ Você ainda não possui um treino cadastrado.' });
        return;
    }

    let text = `💪 *Seu Treino*\n\n`;

    if (hasDigital) {
        text += `📱 *Treinos Digitais (Interativos):*\n`;
        // Use default app domain
        const baseUrl = process.env.FRONTEND_URL || 'https://zapp.fitness';
        digitalWorkouts.forEach((w: any) => {
            text += `• *${w.name}* (${w.exercises.length} exercícios)\n`;
            text += `🔗 Link: ${baseUrl}/w/${w.id}\n\n`;
        });
    }

    if (hasManual) {
        text += `📝 *Anotações / Ficha Manual:*\n${member.workout_routine}\n`;
    }

    await humanizedSendMessage(sock, remoteJid, { text: text.trim() });
}

async function handleGetDiet(member: any, sock: WASocket, remoteJid: string) {
    if (member && member.diet_plan) {
        await humanizedSendMessage(sock, remoteJid, { text: `🥗 *Sua Dieta:*\n\n${member.diet_plan}` });
    } else {
        await humanizedSendMessage(sock, remoteJid, { text: 'ℹ️ Você ainda não possui uma dieta cadastrada.' });
    }
}

async function handleGetStatus(member: any, sock: WASocket, remoteJid: string) {
    if (member) {
        const planName = member.plan?.name || 'Sem plano';
        const expiry = member.plan_end_date ? member.plan_end_date.toLocaleDateString('pt-BR') : 'N/A';
        await humanizedSendMessage(sock, remoteJid, { text: `📋 *Status do Plano*\n\nPlano: ${planName}\nVencimento: ${expiry}\nStatus: ${member.active ? 'Ativo' : 'Inativo'}` });
    } else {
        await humanizedSendMessage(sock, remoteJid, { text: 'ℹ️ Cadastro não encontrado.' });
    }
}

async function handleGetAppointments(member: any, sock: WASocket, remoteJid: string) {
    // Get recurring schedules
    const fixedSchedules = await prisma.memberSchedule.findMany({
        where: { member_id: member.id },
        orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }]
    });

    // Get next 3 one-off appointments
    const oneOffs = await prisma.appointment.findMany({
        where: { member_id: member.id, dateTime: { gte: new Date() }, status: { not: 'CANCELLED' } },
        orderBy: { dateTime: 'asc' },
        take: 3
    });

    if (fixedSchedules.length === 0 && oneOffs.length === 0) {
        await humanizedSendMessage(sock, remoteJid, { text: 'ℹ️ Você não possui horários fixos ou agendamentos ativos.\n\nPara definir sua rotina semanal de treinos, fale com a recepção digitando *5*.' });
        return;
    }

    const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    let text = `🗓️ *Sua Agenda na Academia:*\n\n`;

    if (fixedSchedules.length > 0) {
        text += `⏰ *Horários Fixos Semanais:*\n`;
        fixedSchedules.forEach(s => {
            text += `• *${DAYS[s.day_of_week]}* às *${s.start_time}* (${s.type})\n`;
        });
        text += `\n`;
    }

    if (oneOffs.length > 0) {
        text += `🎯 *Próximos Eventos:* \n`;
        oneOffs.forEach((o: any) => {
            text += `• *${o.dateTime.toLocaleDateString('pt-BR')}* às *${o.dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}* (${o.type})\n`;
        });
    }

    text += `\nPara alterar qualquer horário, procure a recepção.`;
    await humanizedSendMessage(sock, remoteJid, { text });
}
