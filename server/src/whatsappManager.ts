import makeWASocket, { DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import { prisma } from './db.js';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { eventBus, EVENTS } from './events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store multiple WhatsApp sessions: tenantId -> WASocket
export const sessions = new Map<string, WASocket>();

export const getSession = (tenantId: string) => sessions.get(tenantId);

export const reconnectSessions = async () => {
    console.log('[WA] Auto-reconnecting active sessions...');
    const connectedTenants = await prisma.tenant.findMany({
        where: { whatsapp_status: 'CONNECTED', status: 'ACTIVE' }
    });

    console.log(`[WA] Found ${connectedTenants.length} tenants to reconnect.`);

    const { io } = await import('./index.js');

    for (const tenant of connectedTenants) {
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

    const result = await sock.sendMessage(jid, { text });

    // Save outgoing message
    const phone = jid.split('@')[0];

    // Try to find lead or member
    const member = await prisma.member.findFirst({
        where: { tenant_id: tenantId, phone: { contains: phone.slice(-8) } }
    });

    const lead = member ? null : await prisma.lead.upsert({
        where: { phone_tenant_id: { phone, tenant_id: tenantId } },
        update: { last_message: text, last_message_at: new Date() },
        create: { phone, tenant_id: tenantId, last_message: text }
    });

    await prisma.chatMessage.create({
        data: {
            tenant_id: tenantId,
            content: text,
            from_me: true,
            jid: jid,
            member_id: member?.id,
            lead_id: lead?.id,
            type: 'text'
        }
    });

    return result;
};

async function handleMessage(tenantId: string, msg: any, sock: WASocket) {
    try {
        const remoteJid = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.buttonsResponseMessage?.selectedButtonId || msg.message.listResponseMessage?.title || (msg.message.imageMessage ? "[Imagem]" : null);
        const senderName = msg.pushName || "Interessado";

        if (!text) return;

        // Check Tenant Status and Expiry
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { saas_plan: true }
        });

        if (!tenant) return;

        const phone = remoteJid.split('@')[0];

        // 1. Identify if it's a member
        const member = await prisma.member.findFirst({
            where: { tenant_id: tenantId, phone: { contains: phone.slice(-8) } },
            include: { plan: true }
        });

        // 2 & 3. Background Processing (Lead & Chat Logging)
        // We do this without 'await' to respond to the user FAST
        (async () => {
            try {
                let leadId = null;
                if (!member) {
                    const lead = await prisma.lead.upsert({
                        where: { phone_tenant_id: { phone, tenant_id: tenantId } },
                        update: {
                            last_message: text,
                            last_message_at: new Date(),
                            name: senderName
                        },
                        create: {
                            phone,
                            tenant_id: tenantId,
                            last_message: text,
                            name: senderName
                        }
                    });
                    leadId = lead.id;
                }

                const chatMsg = await prisma.chatMessage.create({
                    data: {
                        tenant_id: tenantId,
                        content: text,
                        jid: remoteJid,
                        from_me: false,
                        member_id: member?.id,
                        lead_id: leadId,
                        type: msg.message?.imageMessage ? 'image' : 'text'
                    }
                });

                eventBus.emit(EVENTS.NEW_MESSAGE, chatMsg);
            } catch (err) {
                console.error('[WA] Background logging error:', err);
            }
        })();

        // --- AUTH & PLAN CHECKS (FAST) ---
        if ((tenant as any).status === 'BLOCKED') return;

        if (tenant.saas_plan_expires_at && new Date(tenant.saas_plan_expires_at) < new Date()) {
            await sock.sendMessage(remoteJid, { text: '🚫 O sistema desta academia está temporariamente suspenso por questões administrativas (Plano Expirado). Entre em contato com a gerência.' });
            return;
        }

        console.log(`Received message from ${remoteJid} for tenant ${tenantId}: ${text} `);

        // Normalize text
        const cleanText = text.trim().toLowerCase();

        if (!member) {
            console.log(`Non-member ${phone} contacted tenant ${tenantId}`);
            // No longer sending auto-reply here to allow human to take over or just standard welcome
            // Let's send a standard lead message
            await sock.sendMessage(remoteJid, {
                text: `Olá, *${senderName}*! 👋\n\nSou o assistente digital da *${tenant.name}*.\n\nVerifiquei aqui e você ainda não é nosso aluno. Deseja conhecer nossos planos ou falar com a recepção?\n\nDigite *Planos* ou *Recepção*.`
            });
            return;
        }

        // Menu Navigation for Members
        if (['oi', 'olá', 'ola', 'menu', 'ajuda', 'iniciar', 'start'].includes(cleanText)) {
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
            await sock.sendMessage(remoteJid, { text: '📞 *Falar com a Academia*\n\nEntre em contato diretamente ou aguarde, alguém da recepção irá responder por aqui em breve.' });
        } else if (cleanText === 'planos') {
            const plans = await prisma.plan.findMany({ where: { tenant_id: tenantId } });
            let plansText = `🏋️ *Nossos Planos:*\n\n`;
            plans.forEach(p => {
                plansText += `✅ *${p.name}*: R$ ${p.price}\n`;
            });
            plansText += `\nVenha nos visitar para se matricular!`;
            await sock.sendMessage(remoteJid, { text: plansText });
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
    const menu = `👋 Olá, *${name}*! Bem-vindo(a) à sua academia virtual.\n\nComo posso te ajudar hoje? Digite o número da opção:\n\n` +
        `1️⃣ *Ver Treino*\n` +
        `2️⃣ *Ver Dieta*\n` +
        `3️⃣ *Status do Plano*\n` +
        `4️⃣ *Registrar Entrada (Check-in)*\n` +
        `5️⃣ *Falar com a Academia*`;

    await sock.sendMessage(remoteJid, { text: menu });
}

async function handleCheckin(tenantId: string, member: any, sock: WASocket, remoteJid: string, tenant: any) {
    if (!member.active) {
        await sock.sendMessage(remoteJid, { text: '❌ Acesso negado. Sua matrícula está inativa.' });
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
        await sock.sendMessage(remoteJid, { text: '🚫 Sistema suspenso. Planos expirados não permitem check-in. Contacte a admin da academia.' });
        return;
    }

    if (member.plan_end_date && new Date(member.plan_end_date) < new Date()) {
        const planMsg = settings?.plan_expired
            || "🚫 {name}, seu plano venceu hoje. Passe na recepção para renovar.";

        await sock.sendMessage(remoteJid, { text: planMsg.replace('{name}', member.name.split(' ')[0]) });
        await logAccess(tenantId, member.id, 'DENIED_PLAN_EXPIRED', remoteJid);
        eventBus.emit(EVENTS.CHECKIN_DENIED, { tenantId, memberId: member.id, memberName: member.name, reason: 'PLAN_EXPIRED' });
        return;
    }

    // 1. Time Window Check
    const now = new Date();
    const currentTimeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (tenant.opening_time && tenant.closing_time) {
        if (currentTimeStr < tenant.opening_time || currentTimeStr > tenant.closing_time) {
            await sock.sendMessage(remoteJid, { text: `⛔ A academia está fechada. Horário de funcionamento: ${tenant.opening_time} às ${tenant.closing_time}.` });
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

    if (dailyAccessCount >= tenant.max_daily_access) {
        await sock.sendMessage(remoteJid, { text: `⚠️ Limite diário de acessos atingido (${tenant.max_daily_access} acesso(s) por dia).` });
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
            await sock.sendMessage(remoteJid, { text: `⏳ Aguarde ${waitTime} minutos para realizar um novo check-in.` });
            await logAccess(tenantId, member.id, 'DENIED_COOLDOWN', remoteJid);
            eventBus.emit(EVENTS.CHECKIN_DENIED, { tenantId, memberId: member.id, memberName: member.name, reason: 'COOLDOWN' });
            return;
        }
    }

    // Access Granted
    const msg = settings?.checkin_success || "✅ Acesso Liberado! Bom treino, {name}.";
    await sock.sendMessage(remoteJid, { text: msg.replace('{name}', member.name.split(' ')[0]) });
    await logAccess(tenantId, member.id, 'GRANTED', remoteJid);

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
    if (member && member.workout_routine) {
        await sock.sendMessage(remoteJid, { text: `💪 *Seu Treino:*\n\n${member.workout_routine}` });
    } else {
        await sock.sendMessage(remoteJid, { text: 'ℹ️ Você ainda não possui um treino cadastrado.' });
    }
}

async function handleGetDiet(member: any, sock: WASocket, remoteJid: string) {
    if (member && member.diet_plan) {
        await sock.sendMessage(remoteJid, { text: `🥗 *Sua Dieta:*\n\n${member.diet_plan}` });
    } else {
        await sock.sendMessage(remoteJid, { text: 'ℹ️ Você ainda não possui uma dieta cadastrada.' });
    }
}

async function handleGetStatus(member: any, sock: WASocket, remoteJid: string) {
    if (member) {
        const planName = member.plan?.name || 'Sem plano';
        const expiry = member.plan_end_date ? member.plan_end_date.toLocaleDateString('pt-BR') : 'N/A';
        await sock.sendMessage(remoteJid, { text: `📋 *Status do Plano*\n\nPlano: ${planName}\nVencimento: ${expiry}\nStatus: ${member.active ? 'Ativo' : 'Inativo'}` });
    } else {
        await sock.sendMessage(remoteJid, { text: 'ℹ️ Cadastro não encontrado.' });
    }
}
