import express from 'express';
import cors from 'cors';
import { prisma } from './db.js';
import { initWhatsApp, getSession } from './whatsappManager.js';
import { createCustomer, createSubscription, getSubscription } from './services/asaas.js';
import { Server } from 'socket.io';
import http from 'http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for simplicity in this setup since client is on different domain (local vs prod)
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

// Seed initial SaaS plans if none exist
const seedSaasPlans = async () => {
    const count = await prisma.saasPlan.count();
    if (count === 0) {
        console.log('Seeding initial SaaS plans...');
        const plans = [
            {
                name: 'Start',
                price: 99.00,
                max_members: 50,
                description: 'Ideal para começar',
                features: JSON.stringify(["Até 50 alunos", "WhatsApp Bot Básico", "Check-in QR Code"])
            },
            {
                name: 'Pro',
                price: 199.00,
                max_members: 200,
                description: 'Para academias em crescimento',
                features: JSON.stringify(["Até 200 alunos", "Bot Completo (Treinos/Dieta)", "Relatórios Avançados", "Suporte Prioritário"])
            },
            {
                name: 'Unlimited',
                price: 299.00,
                max_members: 9999,
                description: 'Sem limites',
                features: JSON.stringify(["Alunos Ilimitados", "Múltiplos WhatsApps", "API Aberta", "Consultoria de Implantação"])
            }
        ];

        for (const plan of plans) {
            await prisma.saasPlan.create({ data: plan });
        }
        console.log('Plans seeded!');
    }
};

app.post('/api/register', async (req, res) => {
    const { gymName, email, password, saasPlanId } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        let validPlanId = undefined;
        if (saasPlanId) {
            const plan = await prisma.saasPlan.findUnique({ where: { id: saasPlanId } });
            if (plan) {
                validPlanId = saasPlanId;
            } else {
                // If ID matches a generic name from default landing page, try to find the real one we just seeded
                // This handles the transition from "hardcoded ID" to "DB ID"
                if (saasPlanId.endsWith('-default')) {
                    const name = saasPlanId.replace('-default', '');
                    // SQLite simple search (case sensitive usually, but names match Start/Pro/Unlimited)
                    const realPlan = await prisma.saasPlan.findFirst({
                        where: { name: name.charAt(0).toUpperCase() + name.slice(1) } // Ensure Capitalized like Seed
                    });
                    if (realPlan) validPlanId = realPlan.id;
                }
            }
        }

        const tenant = await prisma.tenant.create({
            data: {
                name: gymName,
                slug: gymName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now(),
                saas_plan_id: validPlanId
            }
        });

        // Create Admin User
        const admin = await prisma.gymAdmin.create({
            data: {
                name: 'Admin',
                email,
                password: hashedPassword,
                // role: 'ADMIN', // Removed as it doesn't exist in schema
                tenant_id: tenant.id
            }
        });

        const token = jwt.sign({ id: admin.id, tenant_id: tenant.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ tenant, admin, token });
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




// CRUD SaaS Plans
app.get('/api/saas/plans', async (req, res) => {
    // Public endpoint for Landing Page? Or authenticated? 
    // Usually public to show pricing. Or make separate public endpoint.
    // For admin dash, we need auth.
    // Let's make this public for now for simplicity in fetching for landing, 
    // BUT SuperAdminDashboard uses it too.
    const plans = await prisma.saasPlan.findMany({ orderBy: { price: 'asc' } });
    res.json(plans);
});

app.post('/api/saas/plans', saasAuthMiddleware, async (req, res) => {
    const { name, price, max_members, description } = req.body;
    try {
        const plan = await prisma.saasPlan.create({
            data: {
                name,
                price: parseFloat(price),
                max_members: parseInt(max_members),
                description,
                features: JSON.stringify(['Suporte WhatsApp', 'Check-in QR Code']) // Default features for now
            }
        });
        res.json(plan);
    } catch (e) {
        res.status(400).json({ error: 'Erro ao criar plano' });
    }
});

app.delete('/api/saas/plans/:id', saasAuthMiddleware, async (req, res) => {
    try {
        await prisma.saasPlan.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: 'Impossível excluir plano em uso' });
    }
});



// ... (existing code)

app.get('/api/me', authMiddleware, async (req: any, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: req.user.tenant_id },
            include: { saas_plan: true, admins: true }
        });
        res.json(tenant);
    } catch (e) {
        res.status(500).json({ error: 'Erro ao buscar dados usuario' });
    }
});

app.post('/api/saas/subscribe', authMiddleware, async (req: any, res) => {
    const { creditCard, cpfCnpj, billingType } = req.body;
    const tenantId = req.user.tenant_id;

    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { saas_plan: true, admins: true }
        });

        if (!tenant || !tenant.saas_plan) {
            return res.status(400).json({ error: 'Nenhum plano selecionado.' });
        }

        const admin = tenant.admins[0]; // Assume first admin is owner
        let customerId = tenant.asaas_customer_id;

        if (!customerId) {
            const customer = await createCustomer(admin.name, cpfCnpj, admin.email, '00000000000'); // Phone should be in admin/tenant
            customerId = customer.id;
            await prisma.tenant.update({ where: { id: tenantId }, data: { asaas_customer_id: customerId } });
        }

        const price = parseFloat(tenant.saas_plan.price.toString());

        // Cancel old subscription if exists? For now assume new.

        const subscription = await createSubscription(customerId!, price, creditCard);

        // Update Tenant
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                subscription_id: subscription.id,
                payment_method: billingType,
                payment_status: 'PENDING' // Will change via webhook or polling
            }
        });

        // Get first payment ID to get Pix Code if needed
        // Subscription response usually has currentCycle or we search payments
        // For simplicity, we return subscription and frontend polls status
        // If Pix, we might need to fetch the charge to get QR Code

        res.json({ subscription });

    } catch (e: any) {
        console.error(e);
        res.status(400).json({ error: e.message });
    }
});

app.get('/api/saas/payment-status', authMiddleware, async (req: any, res) => {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenant_id } });
    if (!tenant?.subscription_id) return res.json({ status: 'NO_SUBSCRIPTION' });

    try {
        const sub = await getSubscription(tenant.subscription_id);
        // If status is ACTIVE, update DB
        if (sub.status === 'ACTIVE' && tenant.payment_status !== 'ACTIVE') {
            await prisma.tenant.update({ where: { id: tenant.id }, data: { payment_status: 'ACTIVE' } });
        }
        res.json({ status: sub.status, subscription: sub });
    } catch (e) {
        res.status(400).json({ error: 'Erro ao buscar assinatura' });
    }
});

// Endpoint to get Pix QR Code for the current pending payment of the subscription
app.get('/api/saas/pix-code', authMiddleware, async (req: any, res) => {
    // Need to find the pending payment for this subscription
    // Asaas API: GET /payments?subscription=ID&status=PENDING
    // API call logic not in service yet, let's just make direct call here or add to service
    // For now, let's implement a simple poll via subscription response which confusingly doesn't always have the immediate payment ID.
    // Better to fetch payments of subscription.
    res.status(501).json({ error: 'Not implemented yet' });
});

import { initScheduler } from './scheduler.js';

const port = 3000;
server.listen(port, async () => {
    await seedSaasOwner();
    // await seedSaasPlans();
    initScheduler();
    console.log(`Server running on http://localhost:${port}`);
});
