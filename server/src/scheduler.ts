import cron from 'node-cron';
import { prisma } from './db';
import { sessions } from './whatsappManager';

export const initScheduler = () => {
    // Run every day at 09:00 AM
    cron.schedule('0 9 * * *', async () => {
        console.log('Running daily automation jobs...');
        await checkPlanWarnings();
        await checkPlanExpirations();
        await notifyOwners();
    });
};

const checkPlanWarnings = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 3 days from now
    const warningDate = new Date(today);
    warningDate.setDate(today.getDate() + 3);
    const warningDateEnd = new Date(warningDate);
    warningDateEnd.setHours(23, 59, 59, 999);

    const expiringMembers = await prisma.member.findMany({
        where: {
            active: true,
            plan_end_date: {
                gte: warningDate,
                lte: warningDateEnd
            }
        },
        include: { tenant: { include: { notificationSettings: true } } }
    });

    for (const member of expiringMembers) {
        const sock = sessions.get(member.tenant_id);
        if (sock && member.tenant.whatsapp_status === 'CONNECTED') {
            const template = member.tenant.notificationSettings?.plan_warning
                || "⚠️ Olá {name}, seu plano vence em {days} dias. Renove para continuar treinando!";

            const msg = template.replace('{name}', member.name.split(' ')[0])
                .replace('{days}', '3');

            // Assuming phone is standard format or we might need to fix it. 
            // Usually valid JID is required. If phone is simple number, append server info.
            // But here let's assume phone is stored correctly or at least raw number.
            // The JID format is number@s.whatsapp.net
            const jid = member.phone.includes('@') ? member.phone : `${member.phone}@s.whatsapp.net`;

            try {
                await sock.sendMessage(jid, { text: msg });
                console.log(`Sent warning to ${member.name}`);
            } catch (e) {
                console.error(`Failed to send warning to ${member.name}`, e);
            }
        }
    }
};

const checkPlanExpirations = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const expiredMembers = await prisma.member.findMany({
        where: {
            active: true,
            plan_end_date: {
                gte: today,
                lte: todayEnd
            }
        },
        include: { tenant: { include: { notificationSettings: true } } }
    });

    for (const member of expiredMembers) {
        const sock = sessions.get(member.tenant_id);
        if (sock && member.tenant.whatsapp_status === 'CONNECTED') {
            const template = member.tenant.notificationSettings?.plan_expired
                || "🚫 {name}, seu plano venceu hoje. Passe na recepção para renovar.";

            const msg = template.replace('{name}', member.name.split(' ')[0]);

            const jid = member.phone.includes('@') ? member.phone : `${member.phone}@s.whatsapp.net`;

            try {
                await sock.sendMessage(jid, { text: msg });
                console.log(`Sent expiry notice to ${member.name}`);
            } catch (e) {
                console.error(`Failed to send expiry notice to ${member.name}`, e);
            }
        }
    }
};

const notifyOwners = async () => {
    // Find all active tenants with owners notified
    const tenants = await prisma.tenant.findMany({
        where: { status: 'ACTIVE', whatsapp_status: 'CONNECTED', owner_phone: { not: null } }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    for (const tenant of tenants) {
        if (!tenant.owner_phone) continue;

        const expiredCount = await prisma.member.count({
            where: {
                tenant_id: tenant.id,
                plan_end_date: {
                    gte: today,
                    lte: todayEnd
                }
            }
        });

        if (expiredCount > 0) {
            const sock = sessions.get(tenant.id);
            if (sock) {
                const msg = `📅 *Resumo Diário*\n\nHoje venceram ${expiredCount} planos de membros. Verifique o painel para mais detalhes.`;
                const jid = tenant.owner_phone.includes('@') ? tenant.owner_phone : `${tenant.owner_phone}@s.whatsapp.net`;
                await sock.sendMessage(jid, { text: msg });
            }
        }
    }
};
