import 'dotenv/config';
import express from 'express';
// import cors from 'cors'; // Switch to manual headers for absolute control
import { prisma } from './db.js';
import { initWhatsApp, getSession } from './whatsappManager.js';
import { createCustomer, createSubscription, getSubscription, getSubscriptionPayment, getPixQrCode } from './services/asaas.js';
import { Server } from 'socket.io';
import http from 'http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eventBus, EVENTS } from './events.js';

// --- PREVENTION FOR CRASHES ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('!!! Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('!!! Uncaught Exception thrown:', err);
});


const app = express();
const server = http.createServer(app);

// --- 0. HEALTH CHECK (BEFORE EVERYTHING) ---
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/api/health', (req, res) => res.status(200).send('OK'));

// --- 1. CONFIGURAÇÕES BASE (DNS/PROXY) ---
app.set('trust proxy', true);

// --- 2. MANUAL CORS (ABSOLUTE CONTROL) ---
app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Permitir qualquer origem que contenha zapp.fitness ou localhost
    if (origin && (origin.includes('zapp.fitness') || origin.includes('localhost'))) {
        res.header('Access-Control-Allow-Origin', origin);
    } else {
        res.header('Access-Control-Allow-Origin', '*');
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

// --- 3. LOGGER DE REQUISIÇÕES ---
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'zapfitness_secret_key_123';


// --- 4. MIDDLEWARES DE AUTENTICAÇÃO (DEFINIDOS ANTES DO USO) ---
const authMiddleware = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        console.error('[Auth] Token inválido:', e);
        res.status(401).json({ error: 'Invalid token' });
    }
};

const saasAuthMiddleware = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'SAAS_OWNER') {
            console.warn(`[Auth] Acesso negado: role=${decoded.role}, email=${decoded.email || 'N/A'}. Não é SAAS_OWNER`);
            return res.status(403).json({ error: 'Forbidden' });
        }
        req.user = decoded;
        next();
    } catch (e) {
        console.error('[Auth] Erro no saasAuthMiddleware:', e);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// --- 5. SOCKET.IO ---
export const io = new Server(server, {
    cors: {
        origin: (origin: any, callback: any) => callback(null, true),
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', msg: 'Backend is alive' }));


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

        if (!gymName || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Transaction to ensure atomic creation
        const { tenant, admin } = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: gymName,
                    slug: gymName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now(),
                    saas_plan_id: validPlanId,
                    gate_token: crypto.randomBytes(16).toString('hex')
                }
            });

            // Create Admin User
            const admin = await tx.gymAdmin.create({
                data: {
                    name: 'Admin',
                    email,
                    password: hashedPassword,
                    tenant_id: tenant.id
                }
            });

            return { tenant, admin };
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

    const token = jwt.sign({ id: admin.id, email: admin.email, tenant_id: admin.tenant_id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, admin, tenant_id: admin.tenant_id });
});

app.get('/api/me', authMiddleware, async (req: any, res) => {
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: req.user.tenant_id },
            include: {
                _count: { select: { members: true, accessLogs: true } },
                saas_plan: true,
                admins: true
            }
        });
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
        res.json(tenant);
    } catch (e) {
        console.error("Error in /api/me:", e);
        res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
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

    if (tenant?.is_free) {
        // No limit for free/trial accounts manually released by admin
    } else if (tenant?.saas_plan) {
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

app.put('/api/members/:id', authMiddleware, async (req: any, res) => {
    try {
        const { name, phone, plan_id, diet, workout } = req.body;

        const member = await prisma.member.findFirst({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });

        if (!member) return res.status(404).json({ error: 'Membro não encontrado' });

        const updated = await prisma.member.update({
            where: { id: member.id },
            data: {
                name,
                phone,
                plan_id: plan_id || null, // Handle empty string as null
                diet_plan: diet,
                workout_routine: workout
            }
        });
        res.json(updated);
    } catch (e: any) {
        console.error('Error updating member:', e);
        res.status(400).json({ error: 'Erro ao atualizar membro: ' + e.message });
    }
});

app.delete('/api/members/:id', authMiddleware, async (req: any, res) => {
    const member = await prisma.member.findFirst({
        where: { id: req.params.id, tenant_id: req.user.tenant_id }
    });

    if (!member) return res.status(404).json({ error: 'Membro não encontrado' });

    await prisma.member.delete({ where: { id: member.id } });
    res.json({ success: true });
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

// --- GATE / TURNSTILE ENDPOINTS ---
app.get('/api/gate/config', authMiddleware, async (req: any, res) => {
    const tenant = await prisma.tenant.findUnique({
        where: { id: req.user.tenant_id },
        select: { gate_token: true, turnstile_brand: true }
    });

    // Auto-generate if missing (for old accounts)
    if (tenant && !tenant.gate_token) {
        const newToken = crypto.randomBytes(16).toString('hex');
        await prisma.tenant.update({
            where: { id: req.user.tenant_id },
            data: { gate_token: newToken }
        });
        return res.json({ gate_token: newToken, turnstile_brand: tenant.turnstile_brand });
    }

    res.json(tenant);
});

app.post('/api/gate/regenerate-token', authMiddleware, async (req: any, res) => {
    const newToken = crypto.randomBytes(16).toString('hex');
    await prisma.tenant.update({
        where: { id: req.user.tenant_id },
        data: { gate_token: newToken }
    });
    res.json({ gate_token: newToken });
});

app.put('/api/gate/brand', authMiddleware, async (req: any, res) => {
    const { brand } = req.body;
    await prisma.tenant.update({
        where: { id: req.user.tenant_id },
        data: { turnstile_brand: brand }
    });
    res.json({ success: true });
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

// --- TURNSTILE INTEGRATION ---
eventBus.on(EVENTS.CHECKIN_GRANTED, (data) => {
    console.log(`[Events] Check-in GRANTED for tenant ${data.tenantId}, member ${data.memberName}`);
    // Emit to the specific gym's room
    io.to(data.tenantId).emit('gate:open', {
        memberId: data.memberId,
        memberName: data.memberName,
        timestamp: new Date()
    });
});

eventBus.on(EVENTS.CHECKIN_DENIED, (data) => {
    console.log(`[Events] Check-in DENIED for tenant ${data.tenantId}, reason: ${data.reason}`);
    io.to(data.tenantId).emit('gate:denied', {
        reason: data.reason,
        timestamp: new Date()
    });
});

// Removido (movido para o topo)

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
    const token = jwt.sign({ id: admin.id, email: admin.email, role: 'SAAS_OWNER' }, JWT_SECRET, { expiresIn: '1d' });
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
        include: {
            _count: { select: { members: true } },
            admins: {
                select: { email: true, name: true }
            },
            saas_plan: true
        }
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

// Update Tenant
app.put('/api/saas/tenants/:id', saasAuthMiddleware, async (req: any, res) => {
    try {
        const { name, owner_phone, is_free } = req.body;
        const updated = await prisma.tenant.update({
            where: { id: req.params.id },
            data: { name, owner_phone, is_free }
        });
        res.json(updated);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// Delete Tenant (Cascade)
app.delete('/api/saas/tenants/:id', saasAuthMiddleware, async (req: any, res) => {
    try {
        const tenantId = req.params.id;

        // Disconnect WA
        const session = getSession(tenantId);
        if (session) session.end(undefined);

        await prisma.$transaction([
            prisma.accessLog.deleteMany({ where: { tenant_id: tenantId } }),
            prisma.securityLog.deleteMany({ where: { tenant_id: tenantId } }),
            prisma.paymentHistory.deleteMany({ where: { tenant_id: tenantId } }),
            prisma.member.deleteMany({ where: { tenant_id: tenantId } }),
            prisma.plan.deleteMany({ where: { tenant_id: tenantId } }),
            prisma.gymAdmin.deleteMany({ where: { tenant_id: tenantId } }),
            prisma.notificationSettings.deleteMany({ where: { tenant_id: tenantId } }),
            prisma.tenant.delete({ where: { id: tenantId } })
        ]);

        res.json({ success: true });
    } catch (e: any) {
        console.error(e);
        res.status(400).json({ error: 'Erro ao excluir academia: ' + e.message });
    }
});

// Disconnect WhatsApp
app.post('/api/saas/tenants/:id/disconnect', saasAuthMiddleware, async (req: any, res) => {
    try {
        const tenantId = req.params.id;
        const session = getSession(tenantId);

        if (session) {
            session.end(undefined);
            // Wait a bit to ensure session cleanup
            await new Promise(r => setTimeout(r, 1000));
        }

        await prisma.tenant.update({
            where: { id: tenantId },
            data: { whatsapp_status: 'DISCONNECTED' }
        });

        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
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
        if (!name || isNaN(parseFloat(price)) || isNaN(parseInt(max_members))) {
            return res.status(400).json({ error: 'Nome, preço e limite de membros são obrigatórios e devem ser válidos.' });
        }

        const plan = await prisma.saasPlan.create({
            data: {
                name,
                price: parseFloat(price),
                max_members: parseInt(max_members),
                description: description || '',
                features: JSON.stringify(['Suporte WhatsApp', 'Check-in QR Code'])
            }
        });
        res.json(plan);
    } catch (e: any) {
        console.error('[Plano] Erro ao criar:', e);
        res.status(400).json({ error: 'Erro ao criar plano: ' + e.message });
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



app.post('/api/saas/subscribe', authMiddleware, async (req: any, res) => {
    const { creditCard, cpfCnpj, billingType, phone } = req.body;
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

        // Update owner phone if provided
        if (phone) {
            await prisma.tenant.update({
                where: { id: tenantId },
                data: { owner_phone: phone }
            });
        }

        const phoneToUse = phone || tenant.owner_phone || '00000000000';

        if (!customerId) {
            const customer = await createCustomer(admin.name, cpfCnpj, admin.email, phoneToUse);
            customerId = customer.id;
            await prisma.tenant.update({ where: { id: tenantId }, data: { asaas_customer_id: customerId } });
        }

        const price = parseFloat(tenant.saas_plan.price.toString());

        // Cancel old subscription if exists? For now assume new.

        const subscription = await createSubscription(customerId!, price, creditCard, phoneToUse);

        // Update Tenant
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                subscription_id: subscription.id,
                payment_method: billingType,
                payment_status: 'PENDING'
            }
        });

        let pixData = null;
        if (billingType === 'PIX') {
            try {
                // Fetch the generated payment for this subscription
                const payment = await getSubscriptionPayment(subscription.id);
                if (payment) {
                    pixData = await getPixQrCode(payment.id);
                }
            } catch (pixErr) {
                console.error("Error fetching PIX code:", pixErr);
            }
        }

        res.json({ subscription, pix: pixData });

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
// Webhook do Asaas
app.post('/webhook/asaas', async (req, res) => {
    try {
        const { event, payment } = req.body;
        console.log(`[Webhook Asaas] Event: ${event}, Payment ID: ${payment?.id}`);

        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
            const subscriptionId = payment?.subscription;
            if (subscriptionId) {
                console.log(`[Webhook Asaas] Payment Confirmed for Subscription: ${subscriptionId}`);

                // Find tenant by subscription
                const tenant = await prisma.tenant.findFirst({
                    where: { subscription_id: subscriptionId }
                });

                if (tenant) {
                    await prisma.tenant.update({
                        where: { id: tenant.id },
                        data: {
                            payment_status: 'ACTIVE',
                            status: 'ACTIVE' // Ensure they are unblocked
                        }
                    });

                    // Add to History
                    await prisma.paymentHistory.create({
                        data: {
                            tenant_id: tenant.id,
                            amount: payment.value,
                            method: payment.billingType,
                            status: 'PAID',
                            asaas_payment_id: payment.id,
                            paid_at: new Date()
                        }
                    });

                    console.log(`[Webhook Asaas] Tenant ${tenant.name} activated/renewed.`);
                } else {
                    console.warn(`[Webhook Asaas] Tenant not found for subscription ${subscriptionId}`);
                }
            }
        }

        res.json({ received: true });
    } catch (e: any) {
        console.error('[Webhook Asaas] Error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/saas/pix-code', authMiddleware, async (req: any, res) => {
    // Need to find the pending payment for this subscription
    // Asaas API: GET /payments?subscription=ID&status=PENDING
    // API call logic not in service yet, let's just make direct call here or add to service
    // For now, let's implement a simple poll via subscription response which confusingly doesn't always have the immediate payment ID.
    // Better to fetch payments of subscription.
    res.status(501).json({ error: 'Not implemented yet' });
});

import { initScheduler } from './scheduler.js';

const port = process.env.PORT || 3000;
// Explicitly listen on 0.0.0.0 for external access (Coolify proxy)
server.listen(Number(port), '0.0.0.0', async () => {
    try {
        console.log(`>>> Server trying to start on port ${port} and address 0.0.0.0`);
        console.log(`>>> WORKDIR: ${process.cwd()}`);
        console.log(`>>> DATABASE_URL: ${process.env.DATABASE_URL}`);

        // Check DB connection
        await prisma.$connect();
        console.log('>>> Database connected successfully');

        await seedSaasOwner();
        initScheduler();

        console.log(`>>> Server is fully ready and listening!`);
    } catch (error) {
        console.error('!!! FAILED TO STARTUP SERVER:', error);
        // Don't kill the process, let it try to recover or stay alive for logs
    }
});


