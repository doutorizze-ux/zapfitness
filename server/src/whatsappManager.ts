import makeWASocket, { DisconnectReason, useMultiFileAuthState, makeCacheableSignalKeyStore, WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import { prisma } from './db.js';
import pino from 'pino';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store multiple WhatsApp sessions: tenantId -> WASocket
export const sessions = new Map<string, WASocket>();

export const getSession = (tenantId: string) => sessions.get(tenantId);

export const initWhatsApp = async (tenantId: string, onQr?: (qr: string) => void) => {
    const logger = pino({ level: 'silent' });
    const authPath = path.resolve(__dirname, `../sessions/${tenantId}`);

    if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true });
    }

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

        if (qr && onQr) {
            onQr(qr);
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[WA] Connection closed for tenant ${tenantId}. Error: ${JSON.stringify(lastDisconnect?.error, null, 2)}`);
            console.log(`[WA] Reconnecting: ${shouldReconnect}`);
            if (shouldReconnect) {
                initWhatsApp(tenantId, onQr);
            } else {
                console.log(`Tenant ${tenantId} logged out.`);
                sessions.delete(tenantId);
                await prisma.tenant.update({ where: { id: tenantId }, data: { whatsapp_status: 'DISCONNECTED' } });
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

async function handleMessage(tenantId: string, msg: any, sock: WASocket) {
    const remoteJid = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

    if (!text) return;

    // Check Tenant Status and Expiry
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { saas_plan: true }
    });

    if (!tenant) return;

    if ((tenant as any).status === 'BLOCKED') {
        console.log(`Tenant ${tenantId} is blocked.Ignoring.`);
        return;
    }

    if (tenant.saas_plan_expires_at && new Date(tenant.saas_plan_expires_at) < new Date()) {
        console.log(`Tenant ${tenantId} plan expired.Ignoring or Sending warning.`);
        // Optional: Send a specific message to the tenant owner or just fail silently/gracefully to user?
        // Requirement says: "Show WhatsApp message informing suspension"
        await sock.sendMessage(remoteJid, { text: '🚫 O sistema desta academia está temporariamente suspenso por questões administrativas (Plano Expirado). Entre em contato com a gerência.' });
        return;
    }

    console.log(`Received message from ${remoteJid} for tenant ${tenantId}: ${text} `);

    // Normalize text
    const cleanText = text.trim().toLowerCase();
    const phone = remoteJid.split('@')[0];

    // Menu Navigation
    if (['oi', 'olá', 'ola', 'menu', 'ajuda', 'iniciar', 'start'].includes(cleanText)) {
        await sendMainMenu(tenantId, sock, remoteJid, phone);
        return;
    }

    if (cleanText === '1' || cleanText.includes('ver treino')) {
        await handleGetWorkout(tenantId, phone, sock, remoteJid);
    } else if (cleanText === '2' || cleanText.includes('ver dieta')) {
        await handleGetDiet(tenantId, phone, sock, remoteJid);
    } else if (cleanText === '3' || cleanText.includes('status') || cleanText.includes('plano')) {
        await handleGetStatus(tenantId, phone, sock, remoteJid);
    } else if (cleanText === '4' || cleanText.includes('checkin') || cleanText.includes('entrada') || cleanText.includes('cheguei')) {
        await handleCheckin(tenantId, phone, sock, remoteJid);
    } else if (cleanText === '5' || cleanText.includes('falar')) {
        await sock.sendMessage(remoteJid, { text: '📞 *Falar com a Academia*\n\nEntre em contato diretamente ou aguarde, alguém da recepção irá responder por aqui em breve.' });
    } else {
        // Fallback or "Unknown command" - maybe re-send menu?
        // Let's be smart: only re-send menu if it looks like a command attempt or just acknowledge.
        // For now, let's keep it simple: if not recognized, send menu.
        // await sendMainMenu(tenantId, sock, remoteJid, phone);
        // Actually, preventing spam loop: only verify checkin from QR codes usually.
        if (cleanText.includes('cheguei')) {
            await handleCheckin(tenantId, phone, sock, remoteJid);
        }
    }
}

async function sendMainMenu(tenantId: string, sock: WASocket, remoteJid: string, phone: string) {
    const member = await prisma.member.findFirst({
        where: { tenant_id: tenantId, phone: { contains: phone.slice(-8) } }
    });

    const name = member ? member.name.split(' ')[0] : 'Visitante';
    const menu = `👋 Olá, * ${name}* !Bem - vindo(a) à sua academia virtual.\n\nComo posso te ajudar hoje ? Digite o número da opção: \n\n` +
        `1️⃣ * Ver Treino *\n` +
        `2️⃣ * Ver Dieta *\n` +
        `3️⃣ * Status do Plano *\n` +
        `4️⃣ * Registrar Entrada(Check -in) *\n` +
        `5️⃣ * Falar com a Academia * `;

    await sock.sendMessage(remoteJid, { text: menu });
}

async function handleCheckin(tenantId: string, phone: string, sock: WASocket, remoteJid: string) {
    const member = await prisma.member.findFirst({
        where: {
            tenant_id: tenantId,
            phone: { contains: phone.slice(-8) }
        }
    });

    if (!member || !member.active) {
        await sock.sendMessage(remoteJid, { text: '❌ Acesso negado. Membro não encontrado ou inativo.' });
        // Log as DENIED_NOT_FOUND or DENIED_INACTIVE
        const reason = !member ? 'DENIED_NOT_FOUND' : 'DENIED_INACTIVE';
        await logAccess(tenantId, member?.id || null, reason, remoteJid);

        if (!member) {
            await handleSuspiciousActivity(tenantId, phone, remoteJid);
        }
        return;
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { notificationSettings: true, saas_plan: true } });
    if (!tenant) return;

    // SaaS Plan Expiry Check (Already done in automated check, but check here too for safety)
    if (tenant.saas_plan_expires_at && new Date(tenant.saas_plan_expires_at) < new Date()) {
        await sock.sendMessage(remoteJid, { text: '🚫 Sistema suspenso. Planos expirados não permitem check-in. Contacte a admin da academia.' });
        return;
    }

    if (member.plan_end_date && new Date(member.plan_end_date) < new Date()) {
        const planMsg = tenant.notificationSettings?.plan_expired
            || "🚫 {name}, seu plano venceu hoje. Passe na recepção para renovar.";

        await sock.sendMessage(remoteJid, { text: planMsg.replace('{name}', member.name.split(' ')[0]) });
        await logAccess(tenantId, member.id, 'DENIED_PLAN_EXPIRED', remoteJid);
        return;
    }

    // 1. Time Window Check
    const now = new Date();
    // Get time string "HH:MM"
    const currentTimeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (tenant.opening_time && tenant.closing_time) {
        if (currentTimeStr < tenant.opening_time || currentTimeStr > tenant.closing_time) {
            await sock.sendMessage(remoteJid, { text: `⛔ A academia está fechada. Horário de funcionamento: ${tenant.opening_time} às ${tenant.closing_time}.` });
            await logAccess(tenantId, member.id, 'DENIED_OUTSIDE_HOURS', remoteJid);
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
            return;
        }
    }

    // Access Granted
    const msg = tenant.notificationSettings?.checkin_success || "✅ Acesso Liberado! Bom treino, {name}.";
    await sock.sendMessage(remoteJid, { text: msg.replace('{name}', member.name.split(' ')[0]) });
    await logAccess(tenantId, member.id, 'GRANTED', remoteJid);
}

async function handleSuspiciousActivity(tenantId: string, phone: string, remoteJid: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for recent repeated failures (potential brute force or spam)
    const recentLogs = await prisma.securityLog.count({
        where: {
            tenant_id: tenantId,
            source: remoteJid,
            created_at: { gte: new Date(Date.now() - 15 * 60 * 1000) } // Last 15 min
        }
    });

    if (recentLogs > 5) {
        // High severity event: spamming
        console.warn(`[SECURITY] High interaction rate from ${remoteJid} for tenant ${tenantId}`);
        // Consider temporarily blocking? 
        return;
    }

    // Log the event
    await prisma.securityLog.create({
        data: {
            tenant_id: tenantId,
            event_type: 'INVALID_ACCESS_ATTEMPT',
            description: `Unknown number ${phone} attempted to check in.`,
            severity: 'LOW',
            source: remoteJid
        }
    });

    // Escalate if needed
    const recentFailures = await prisma.securityLog.count({
        where: {
            tenant_id: tenantId,
            source: remoteJid,
            event_type: 'INVALID_ACCESS_ATTEMPT',
            created_at: { gte: new Date(Date.now() - 5 * 60 * 1000) }
        }
    });

    if (recentFailures >= 3) {
        await prisma.securityLog.create({
            data: {
                tenant_id: tenantId,
                event_type: 'POTENTIAL_BRUTE_FORCE',
                description: `Number ${phone} failed ${recentFailures} times in 5 minutes.`,
                severity: 'HIGH',
                source: remoteJid
            }
        });
    }
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

async function handleGetWorkout(tenantId: string, phone: string, sock: WASocket, remoteJid: string) {
    const member = await prisma.member.findFirst({
        where: { tenant_id: tenantId, phone: { contains: phone.slice(-8) } }
    });

    if (member && member.workout_routine) {
        await sock.sendMessage(remoteJid, { text: `💪 * Seu Treino:*\n\n${member.workout_routine} ` });
    } else {
        await sock.sendMessage(remoteJid, { text: 'ℹ️ Você ainda não possui um treino cadastrado.' });
    }
}

async function handleGetDiet(tenantId: string, phone: string, sock: WASocket, remoteJid: string) {
    const member = await prisma.member.findFirst({
        where: { tenant_id: tenantId, phone: { contains: phone.slice(-8) } }
    });

    if (member && member.diet_plan) {
        await sock.sendMessage(remoteJid, { text: `🥗 * Sua Dieta:*\n\n${member.diet_plan} ` });
    } else {
        await sock.sendMessage(remoteJid, { text: 'ℹ️ Você ainda não possui uma dieta cadastrada.' });
    }
}

async function handleGetStatus(tenantId: string, phone: string, sock: WASocket, remoteJid: string) {
    const member = await prisma.member.findFirst({
        where: { tenant_id: tenantId, phone: { contains: phone.slice(-8) } },
        include: { plan: true }
    });

    if (member) {
        const planName = member.plan?.name || 'Sem plano';
        const expiry = member.plan_end_date ? member.plan_end_date.toLocaleDateString('pt-BR') : 'N/A';
        await sock.sendMessage(remoteJid, { text: `📋 * Status do Plano *\n\nPlano: ${planName} \nVencimento: ${expiry} \nStatus: ${member.active ? 'Ativo' : 'Inativo'} ` });
    } else {
        await sock.sendMessage(remoteJid, { text: 'ℹ️ Cadastro não encontrado.' });
    }
}
