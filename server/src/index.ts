import express from 'express';
import cors from 'cors';
import { prisma } from './db';
import { initWhatsApp, getSession } from './whatsappManager';
import { Server } from 'socket.io';
import http from 'http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = 'zapfitness_secret_key_123';

const authMiddleware = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

app.post('/api/register', async (req, res) => {
    const { gymName, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const tenant = await prisma.tenant.create({
            data: {
                name: gymName,
                slug: gymName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now(),
            }
        });

        const admin = await prisma.gymAdmin.create({
            data: {
                name: 'Admin',
                email,
                password: hashedPassword,
                tenant_id: tenant.id
            }
        });

        res.json({ tenant, admin });
    } catch (e: any) {
        console.error(e);
        res.status(400).json({ error: 'Registration failed', details: e.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const admin = await prisma.gymAdmin.findUnique({ where: { email } });

    if (!admin || !await bcrypt.compare(password, admin.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin.id, tenant_id: admin.tenant_id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin, tenant_id: admin.tenant_id });
});

app.get('/api/me', authMiddleware, async (req: any, res) => {
    const tenant = await prisma.tenant.findUnique({
        where: { id: req.user.tenant_id },
        include: { _count: { select: { members: true, accessLogs: true } } }
    });
    res.json(tenant);
});

// --- LOG: endpoint de conexão WhatsApp (quando frontend solicita gerar/ligar)
app.post('/api/whatsapp/connect', authMiddleware, async (req: any, res) => {
    const tenantId = req.user.tenant_id;
    console.log(`[API] /api/whatsapp/connect called, tenantId=${tenantId}, timestamp=${new Date().toISOString()}`);

    // iniciar fluxo de conexão que chama initWhatsApp(...)
    initWhatsApp(tenantId, (qr) => {
        console.log(`[WA] QR Generated for tenant=${tenantId} (length=${qr?.length}) at ${new Date().toISOString()}`);
        // tentar emitir para a sala do tenant
        try {
            console.log(`[WA] Emitting 'qr_code' to room=${tenantId}`);
            io.to(tenantId).emit('qr_code', qr);
            console.log(`[WA] Emit done for tenant=${tenantId}`);
        } catch (emitErr) {
            console.error(`[WA] Emit ERROR for tenant=${tenantId}:`, emitErr);
        }
    }).then((sock) => {
        if (sock?.user) {
            console.log(`[WA] auth success tenant=${tenantId}`);
            io.to(tenantId).emit('whatsapp_status', 'CONNECTED');
        }
    });

    res.json({ status: 'INITIALIZING' });
});

app.post('/api/whatsapp/disconnect', authMiddleware, async (req: any, res) => {
    const tenantId = req.user.tenant_id;
    console.log(`[API] /api/whatsapp/disconnect called for tenant=${tenantId}`);

    const session = getSession(tenantId);
    if (session) {
        try {
            await session.end(undefined);
        } catch (e) {
            console.error('[WA] Error ending session:', e);
        }
    }

    // Force DB update
    await prisma.tenant.update({
        where: { id: tenantId },
        data: { whatsapp_status: 'DISCONNECTED' }
    });

    // Clear session folder if exists
    // (Optional: FS implementation dependent, simpler to rely on Baileys cleanup or next init)

    io.to(tenantId).emit('whatsapp_status', 'DISCONNECTED');
    res.json({ status: 'DISCONNECTED' });
});

app.get('/api/whatsapp/status', authMiddleware, async (req: any, res) => {
    const tenantId = req.user.tenant_id;
    const session = getSession(tenantId);
    if (session?.user) {
        console.log(`[API] Checking status for ${tenantId}: CONNECTED (User: ${session.user.id})`);
    } else {
        console.log(`[API] Checking status for ${tenantId}: DISCONNECTED/LOADING`);
    }
    // Also check DB
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    res.json({ status: tenant?.whatsapp_status || 'DISCONNECTED', connected: !!session?.user });
});

app.get('/api/members', authMiddleware, async (req: any, res) => {
    const members = await prisma.member.findMany({
        where: { tenant_id: req.user.tenant_id },
        include: { plan: true },
        orderBy: { name: 'asc' }
    });
    res.json(members);
});

app.post('/api/members', authMiddleware, async (req: any, res) => {
    const { name, phone, plan_id, diet, workout } = req.body;

    // SaaS Limit Check
    const tenant = await prisma.tenant.findUnique({
        where: { id: req.user.tenant_id },
        include: { saas_plan: true, _count: { select: { members: true } } }
    });

    if (tenant?.saas_plan) {
        if (tenant._count.members >= tenant.saas_plan.max_members) {
            return res.status(403).json({ error: 'Limite de membros excedido. Faça upgrade do seu plano.' });
        }
    } else {
        // Default limit if no plan assigned (e.g. Free Tier)
        if (tenant && tenant._count.members >= 50) {
            return res.status(403).json({ error: 'Limite do plano gratuito atingido (50 membros).' });
        }
    }

    let planEndDate = new Date();

    if (plan_id) {
        const plan = await prisma.plan.findUnique({ where: { id: plan_id } });
        if (plan) {
            planEndDate.setDate(planEndDate.getDate() + plan.duration_days);
        }
    } else {
        planEndDate.setDate(planEndDate.getDate() + 30);
    }

    const member = await prisma.member.create({
        data: {
            name,
            phone,
            tenant_id: req.user.tenant_id,
            plan_id: plan_id || undefined,
            plan_start_date: new Date(),
            plan_end_date: planEndDate,
            diet_plan: diet,
            workout_routine: workout,
            active: true
        }
    });
    res.json(member);
});

app.get('/api/plans', authMiddleware, async (req: any, res) => {
    const plans = await prisma.plan.findMany({
        where: { tenant_id: req.user.tenant_id }
    });
    res.json(plans);
});

app.post('/api/plans', authMiddleware, async (req: any, res) => {
    const { name, price, duration_days } = req.body;
    const plan = await prisma.plan.create({
        data: {
            name,
            price: parseFloat(price),
            duration_days: parseInt(duration_days),
            tenant_id: req.user.tenant_id
        }
    });
    res.json(plan);
});

app.delete('/api/plans/:id', authMiddleware, async (req: any, res) => {
    await prisma.plan.delete({
        where: { id: req.params.id }
    });
    res.json({ success: true });
});

app.get('/api/logs', authMiddleware, async (req: any, res) => {
    const logs = await prisma.accessLog.findMany({
        where: { tenant_id: req.user.tenant_id },
        include: { member: true },
        orderBy: { scanned_at: 'desc' },
        take: 50
    });
    res.json(logs);
});

io.on('connection', (socket: any) => {
    console.log(`[IO] socket connected id=${socket.id}, handshake.query=${JSON.stringify(socket.handshake.query)}`);

    socket.on('join_room', (room: string) => {
        try {
            console.log(`[IO] socket ${socket.id} requested join_room=${room} at ${new Date().toISOString()}`);
            socket.join(room);
            console.log(`[IO] socket ${socket.id} joined room=${room}`);
            socket.emit('joined_room', { room, socketId: socket.id });
        } catch (err) {
            console.error('[IO] Error on join_room:', err);
        }
    });

    socket.on('disconnect', (reason: any) => {
        console.log(`[IO] socket ${socket.id} disconnected: ${reason}`);
    });
});

const saasAuthMiddleware = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'SAAS_OWNER') return res.status(403).json({ error: 'Forbidden' });
        req.user = decoded;
        next();
    } catch (e) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

const seedSaasOwner = async () => {
    const email = 'admin@zapfitness.com';
    const exists = await prisma.saasOwner.findUnique({ where: { email } });
    if (!exists) {
        const password = await bcrypt.hash('admin123', 10);
        await prisma.saasOwner.create({ data: { email, password } });
        console.log('SaaS Owner seeded: admin@zapfitness.com / admin123');
    }
};

app.post('/api/saas/login', async (req, res) => {
    const { email, password } = req.body;
    const admin = await prisma.saasOwner.findUnique({ where: { email } });
    if (!admin || !await bcrypt.compare(password, admin.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: admin.id, role: 'SAAS_OWNER' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, admin });
});

app.get('/api/saas/dashboard', saasAuthMiddleware, async (req, res) => {
    const totalGyms = await prisma.tenant.count();
    const activeGyms = await prisma.tenant.count({ where: { status: 'ACTIVE' } });
    const blockedGyms = await prisma.tenant.count({ where: { status: 'BLOCKED' } });
    const totalMembers = await prisma.member.count();

    res.json({ totalGyms, activeGyms, blockedGyms, totalMembers });
});

app.get('/api/saas/tenants', saasAuthMiddleware, async (req, res) => {
    const tenants = await prisma.tenant.findMany({
        orderBy: { created_at: 'desc' },
        include: { _count: { select: { members: true } } }
    });
    res.json(tenants);
});

app.post('/api/saas/tenants/:id/toggle', saasAuthMiddleware, async (req, res) => {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const newStatus = tenant.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';

    if (newStatus === 'BLOCKED') {
        const session = getSession(tenant.id);
        if (session) {
            session.end(undefined);
            // sessions.delete(tenant.id); -> handled by connection.update
        }
        await prisma.tenant.update({ where: { id: tenant.id }, data: { whatsapp_status: 'DISCONNECTED', status: 'BLOCKED' } });
    } else {
        await prisma.tenant.update({ where: { id: tenant.id }, data: { status: 'ACTIVE' } });
    }

    res.json({ status: newStatus });
});


const seedSaasPlans = async () => {
    const plans = [
        { name: 'Start', price: 99.00, max_members: 50 },
        { name: 'Pro', price: 199.00, max_members: 200 },
        { name: 'Unlimited', price: 299.00, max_members: 999999 }
    ];

    for (const p of plans) {
        const exists = await prisma.saasPlan.findFirst({ where: { name: p.name } });
        if (!exists) {
            await prisma.saasPlan.create({ data: { name: p.name, price: p.price, max_members: p.max_members } });
            console.log(`SaaS Plan seeded: ${p.name}`);
        }
    }
};

import { initScheduler } from './scheduler';

const port = 3000;
server.listen(port, async () => {
    await seedSaasOwner();
    await seedSaasPlans();
    initScheduler();
    console.log(`Server running on http://localhost:${port}`);
});
