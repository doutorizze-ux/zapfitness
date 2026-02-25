import 'dotenv/config';
import express from 'express';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// import cors from 'cors'; // Switch to manual headers for absolute control
import { prisma } from './db.js';
import { initWhatsApp, getSession, reconnectSessions, logoutSession, sendMessageToJid } from './whatsappManager.js';
import { initScheduler } from './scheduler.js';
import { createCustomer, createSubscription, getSubscription, getLatestPayment, getPixQrCode } from './services/asaas.js';
import { Server } from 'socket.io';
import http from 'http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { eventBus, EVENTS } from './events.js';
import multer from 'multer';
import cors from 'cors';

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
app.use(cors());

// Configure Multer for uploads
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Somente imagens são permitidas'));
        }
    }
});

app.use('/uploads', express.static(uploadsDir));
const JWT_SECRET = process.env.JWT_SECRET || 'zapfitness_secret_key_123';


// --- 4. MIDDLEWARES DE AUTENTICAÇÃO (DEFINIDOS ANTES DO USO) ---
const authMiddleware = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Não autorizado' });

    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        console.error('[Auth] Token inválido:', e);
        res.status(401).json({ error: 'Token inválido' });
    }
};

const saasAuthMiddleware = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'SAAS_OWNER') {
            console.warn(`[Auth] Acesso negado: role=${decoded.role}, email=${decoded.email || 'N/A'}. Não é SAAS_OWNER`);
            return res.status(403).json({ error: 'Proibido' });
        }
        req.user = decoded;
        next();
    } catch (e) {
        console.error('[Auth] Erro no saasAuthMiddleware:', e);
        res.status(401).json({ error: 'Token inválido' });
    }
};

export const io = new Server(server, {
    cors: {
        origin: (origin: any, callback: any) => callback(null, true),
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true
});

io.on('connection', (socket) => {
    socket.on('join', (tenantId) => {
        socket.join(tenantId);
        console.log(`[Socket] Socket ${socket.id} joined room ${tenantId}`);
    });
});

// (Redundant listeners removed, kept below near line 1360)



// --- SERVE FRONTEND (STATIC FILES) ---
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    console.log(`[Static] Serving frontend from ${publicDir}`);
}

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
            return res.status(400).json({ error: 'Campos obrigatórios faltando' });
        }

        // Transaction to ensure atomic creation
        const { tenant, admin } = await prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: gymName,
                    slug: gymName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now(),
                    saas_plan_id: validPlanId,
                    status: 'BLOCKED', // Default to BLOCKED for manual approval
                    payment_status: 'PENDING',
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

        const token = jwt.sign({ id: admin.id, tenant_id: tenant.id }, JWT_SECRET, { expiresIn: '730d' });
        res.json({ tenant, admin, token });
    } catch (e: any) {
        console.error(e);
        res.status(400).json({ error: 'Falha no registro', details: e.message });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const admin = await prisma.gymAdmin.findUnique({
        where: { email },
        include: { tenant: true }
    });

    if (!admin || !await bcrypt.compare(password, admin.password)) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email, tenant_id: admin.tenant_id }, JWT_SECRET, { expiresIn: '730d' });

    // Merge tenant customization into the user object for the frontend
    const userResponse = {
        ...admin,
        logo_url: admin.tenant.logo_url,
        primary_color: admin.tenant.primary_color,
        enable_scheduling: admin.tenant.enable_scheduling,
        // You might want to use the gym name as the display name, or keep the admin name.
        // Usually for the dashboard header, the gym name is preferred if available.
        // name: admin.tenant.name || admin.name 
    };

    res.json({ token, admin: userResponse, tenant_id: admin.tenant_id });
});

app.get('/api/me', authMiddleware, async (req: any, res) => {
    try {
        let tenant = await prisma.tenant.findUnique({
            where: { id: req.user.tenant_id },
            include: {
                _count: { select: { members: true, accessLogs: true } },
                saas_plan: true,
                admins: true,
                notificationSettings: true
            }
        });

        if (!tenant) return res.status(404).json({ error: 'Academia não encontrada' });

        // Verifica se a sessão está realmente ativa no servidor
        const session = getSession(tenant.id);
        const realConnected = !!(session && (session as any).user);

        // Se no banco diz que está conectado, mas a sessão morreu, corrige o dado para o frontend
        let currentStatus = tenant.whatsapp_status;
        if (currentStatus === 'CONNECTED' && !realConnected) {
            currentStatus = 'DISCONNECTED';
            // Opcional: Atualizar o banco de forma assíncrona para sincronizar
            prisma.tenant.update({ where: { id: tenant.id }, data: { whatsapp_status: 'DISCONNECTED' } }).catch(() => { });
        }

        const responseData = {
            ...tenant,
            whatsapp_status: currentStatus
        };

        // Auto-verify if not active and has subscription
        // Auto-verify if not active and has subscription
        // COMENTADO: Venda interna / Manual Approval Mode
        /*
        if (tenant.payment_status !== 'ACTIVE' && tenant.subscription_id && !tenant.is_free) {
             // ... previous logic commented out ...
        }
        */

        res.json(responseData);
    } catch (e) {
        console.error("Error in /api/me:", e);
        res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
});

// --- SYSTEM SETTINGS ---
app.get('/api/system/settings', async (req, res) => {
    try {
        const settings = await prisma.systemSettings.findFirst({
            where: { id: 'global' }
        });
        res.json(settings || { site_name: 'ZapFitness', logo_url: '' });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
});

app.put('/api/system/settings', saasAuthMiddleware, async (req: any, res) => {
    try {
        const { site_name, logo_url } = req.body;
        const updated = await prisma.systemSettings.upsert({
            where: { id: 'global' },
            update: { site_name, logo_url },
            create: { id: 'global', site_name, logo_url }
        });
        res.json(updated);
    } catch (e: any) {
        res.status(400).json({ error: 'Erro ao salvar configurações' });
    }
});

app.post('/api/upload', authMiddleware, upload.single('file'), (req: any, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    const publicUrl = `/uploads/${req.file.filename}`;
    res.json({ url: publicUrl });
});

// Update Tenant Profile
app.put('/api/settings/profile', authMiddleware, async (req: any, res) => {
    try {
        const { name, logo_url, primary_color } = req.body;
        const updated = await prisma.tenant.update({
            where: { id: req.user.tenant_id },
            data: { name, logo_url, primary_color } as any
        });
        res.json(updated);
    } catch (e: any) {
        res.status(400).json({ error: 'Erro ao atualizar perfil: ' + e.message });
    }
});

// Update Admin Password
app.put('/api/settings/security', authMiddleware, async (req: any, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const admin = await prisma.gymAdmin.findUnique({ where: { id: req.user.id } });

        if (!admin || !await bcrypt.compare(currentPassword, admin.password)) {
            return res.status(400).json({ error: 'Senha atual incorreta' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.gymAdmin.update({
            where: { id: req.user.id },
            data: { password: hashedPassword }
        });

        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ error: 'Erro ao atualizar senha: ' + e.message });
    }
});

// Update Access/Operational Settings
app.put('/api/settings/access', authMiddleware, async (req: any, res) => {
    try {
        const { opening_time, closing_time, access_cooldown, max_daily_access, enable_scheduling } = req.body;
        const updated = await prisma.tenant.update({
            where: { id: req.user.tenant_id },
            data: {
                opening_time,
                closing_time,
                access_cooldown: parseInt(access_cooldown),
                max_daily_access: parseInt(max_daily_access),
                enable_scheduling: enable_scheduling === true
            }
        });
        res.json(updated);
    } catch (e: any) {
        res.status(400).json({ error: 'Erro ao atualizar configurações: ' + e.message });
    }
});

// Update Notification Messages
app.put('/api/settings/notifications', authMiddleware, async (req: any, res) => {
    try {
        const { checkin_success, plan_warning, plan_expired } = req.body;
        const updated = await prisma.notificationSettings.upsert({
            where: { tenant_id: req.user.tenant_id },
            update: { checkin_success, plan_warning, plan_expired },
            create: {
                tenant_id: req.user.tenant_id,
                checkin_success,
                plan_warning,
                plan_expired
            }
        });
        res.json(updated);
    } catch (e: any) {
        res.status(400).json({ error: 'Erro ao atualizar mensagens: ' + e.message });
    }
});

// --- LOG: endpoint de conexão WhatsApp (quando frontend solicita gerar/ligar)
app.post('/api/whatsapp/connect', authMiddleware, async (req: any, res) => {
    const tenantId = req.user.tenant_id;
    console.log(`[API] /api/whatsapp/connect called, tenantId=${tenantId}, timestamp=${new Date().toISOString()}`);

    // iniciar fluxo de conexão que chama initWhatsApp(...)
    initWhatsApp(
        tenantId,
        (qr) => {
            console.log(`[WA] QR Generated for tenant=${tenantId} (length=${qr?.length}) at ${new Date().toISOString()}`);
            io.to(tenantId).emit('qr_code', qr);
        },
        (status) => {
            console.log(`[WA] Status Update for tenant=${tenantId}: ${status}`);
            io.to(tenantId).emit('whatsapp_status', status);
        }
    );

    res.json({ status: 'INITIALIZING' });
});

app.post('/api/chat/send', authMiddleware, async (req: any, res) => {
    try {
        const { jid, text } = req.body;
        if (!jid || !text) return res.status(400).json({ error: 'JID e texto são obrigatórios' });

        // 1. Send the message
        await sendMessageToJid(req.user.tenant_id, jid, text);

        // 2. Automatically pause the bot for this member/lead (human intervention)
        const phone = jid.split('@')[0].replace(/\D/g, '');
        await prisma.member.updateMany({
            where: { tenant_id: req.user.tenant_id, OR: [{ whatsapp_jid: jid }, { phone: { contains: phone.slice(-8) } }] },
            data: { bot_paused: true }
        });

        res.json({ success: true });
    } catch (e: any) {
        console.error('[Chat] Erro ao enviar mensagem:', e);
        res.status(500).json({ error: e.message });
    }
});

// --- Leads & Chat Routes ---
app.get('/api/leads', authMiddleware, async (req: any, res) => {
    try {
        const leads = await prisma.lead.findMany({
            where: { tenant_id: req.user.tenant_id },
            orderBy: { last_message_at: 'desc' }
        });
        res.json(leads);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/leads', authMiddleware, async (req: any, res) => {
    try {
        const { name, phone, status, value } = req.body;
        if (!phone) return res.status(400).json({ error: 'Telefone é obrigatório' });

        const lead = await prisma.lead.upsert({
            where: {
                phone_tenant_id: {
                    phone,
                    tenant_id: req.user.tenant_id
                }
            },
            update: {
                name: name || undefined,
                status: status || undefined,
                value: value !== undefined ? parseFloat(value) : undefined
            },
            create: {
                name,
                phone,
                status: status || 'new',
                value: value ? parseFloat(value) : 0,
                tenant_id: req.user.tenant_id
            }
        });
        res.json(lead);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/leads/:id', authMiddleware, async (req: any, res) => {
    try {
        const { status, value, name } = req.body;
        const updated = await prisma.lead.update({
            where: { id: req.params.id, tenant_id: req.user.tenant_id },
            data: {
                status,
                value: value !== undefined ? parseFloat(value) : undefined,
                name
            }
        });
        res.json(updated);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/leads/:id', authMiddleware, async (req: any, res) => {
    try {
        await prisma.$transaction([
            prisma.chatMessage.deleteMany({ where: { lead_id: req.params.id } }),
            prisma.lead.delete({
                where: { id: req.params.id, tenant_id: req.user.tenant_id }
            })
        ]);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/leads/:id/messages', authMiddleware, async (req: any, res) => {
    try {
        const messages = await prisma.chatMessage.findMany({
            where: { lead_id: req.params.id, tenant_id: req.user.tenant_id },
            orderBy: { created_at: 'asc' }
        });
        res.json(messages);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/leads/:id/messages', authMiddleware, async (req: any, res) => {
    try {
        const { content } = req.body;
        const lead = await prisma.lead.findUnique({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });

        if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

        const cleanPhone = lead.phone.replace(/\D/g, '');
        const jid = `${cleanPhone}@s.whatsapp.net`;
        await sendMessageToJid(req.user.tenant_id, jid, content);

        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- Exercise & Workout Routes ---

// List all exercises for a tenant
app.get('/api/exercises', authMiddleware, async (req: any, res) => {
    try {
        const exercises = await prisma.exercise.findMany({
            where: { tenant_id: req.user.tenant_id },
            orderBy: { name: 'asc' }
        });
        res.json(exercises);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Create/Update an exercise
app.post('/api/exercises', authMiddleware, async (req: any, res) => {
    try {
        const { id, name, description, category, video_url } = req.body;
        if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

        const exercise = await prisma.exercise.upsert({
            where: { id: id || 'new-id' },
            update: { name, description, category, video_url },
            create: { name, description, category, video_url, tenant_id: req.user.tenant_id }
        });
        res.json(exercise);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Delete an exercise
app.delete('/api/exercises/:id', authMiddleware, async (req: any, res) => {
    try {
        const exerciseId = req.params.id;
        const tenant_id = req.user.tenant_id;

        await prisma.$transaction([
            prisma.workoutExercise.deleteMany({
                where: { exercise_id: exerciseId }
            }),
            prisma.exercise.delete({
                where: { id: exerciseId, tenant_id }
            })
        ]);

        res.json({ success: true });
    } catch (e: any) {
        console.error('[Exercise] Delete error:', e);
        res.status(500).json({ error: e.message });
    }
});

// List workouts for a member
app.get('/api/members/:id/workouts', authMiddleware, async (req: any, res) => {
    try {
        const workouts = await prisma.workout.findMany({
            where: { member_id: req.params.id, tenant_id: req.user.tenant_id },
            include: {
                exercises: {
                    include: { exercise: true },
                    orderBy: { order: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.json(workouts);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/members/:id/messages', authMiddleware, async (req: any, res) => {
    try {
        const messages = await prisma.chatMessage.findMany({
            where: {
                tenant_id: req.user.tenant_id,
                member_id: req.params.id
            },
            orderBy: { created_at: 'asc' }
        });
        res.json(messages);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Create/Update a workout with its exercises
app.post('/api/members/:id/workouts', authMiddleware, async (req: any, res) => {
    try {
        const { id, name, notes, active, exercises: exercisesData } = req.body;
        const member_id = req.params.id;

        const result = await prisma.$transaction(async (tx) => {
            const workout = await tx.workout.upsert({
                where: { id: id || 'new-workout-id-placeholder' },
                update: { name, notes, active },
                create: {
                    name,
                    notes,
                    active: active ?? true,
                    member_id,
                    tenant_id: req.user.tenant_id
                }
            });

            if (exercisesData) {
                await tx.workoutExercise.deleteMany({
                    where: { workout_id: workout.id }
                });

                if (exercisesData.length > 0) {
                    for (const [index, ex] of exercisesData.entries()) {
                        await tx.workoutExercise.create({
                            data: {
                                workout_id: workout.id,
                                exercise_id: ex.exercise_id,
                                sets: ex.sets ? parseInt(ex.sets.toString()) : undefined,
                                reps: ex.reps?.toString(),
                                weight: ex.weight?.toString(),
                                rest_time: ex.rest_time?.toString(),
                                order: ex.order !== undefined ? parseInt(ex.order.toString()) : index
                            }
                        });
                    }
                }
            }

            return tx.workout.findUnique({
                where: { id: workout.id },
                include: {
                    exercises: {
                        include: { exercise: true },
                        orderBy: { order: 'asc' }
                    }
                }
            });
        });

        res.json(result);
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Delete a workout
app.delete('/api/workouts/:id', authMiddleware, async (req: any, res) => {
    try {
        await prisma.workout.delete({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});


// Public route to fetch member workout (for the student)
app.get('/api/public/workouts/:id', async (req: any, res) => {
    try {
        const id = req.params.id?.trim();
        console.log(`[PublicAPI] Searching for ID: ${id}`);

        let workouts = await prisma.workout.findMany({
            where: {
                OR: [
                    { id: id },
                    { member_id: id }
                ]
            },
            include: {
                exercises: {
                    include: { exercise: true },
                    orderBy: { order: 'asc' }
                },
                member: {
                    select: {
                        name: true,
                        tenant: {
                            select: { name: true, primary_color: true, logo_url: true }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        // If no digital workouts, check if there's a manual workout (workout_routine)
        if (workouts.length === 0) {
            const member = await prisma.member.findFirst({
                where: { id: id },
                include: { tenant: { select: { name: true, primary_color: true, logo_url: true } } }
            });

            if (member && member.workout_routine && member.workout_routine.trim() !== '') {
                console.log(`[PublicAPI] Found manual workout routine for member ${member.name}. Synthesizing response.`);
                workouts = [{
                    id: `manual-${member.id}`,
                    name: 'Ficha de Treino',
                    notes: member.workout_routine,
                    active: true,
                    exercises: [],
                    member: {
                        name: member.name,
                        tenant: member.tenant
                    }
                } as any];
            }
        }

        console.log(`[PublicAPI] Result: Found ${workouts.length} workouts for target ${id}`);
        res.json(workouts);
    } catch (e: any) {
        console.error(`[PublicAPI] Error:`, e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/whatsapp/disconnect', authMiddleware, async (req: any, res) => {
    const tenantId = req.user.tenant_id;
    console.log(`[API] /api/whatsapp/disconnect called for tenant=${tenantId}`);

    try {
        await logoutSession(tenantId);

        // Force DB update
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { whatsapp_status: 'DISCONNECTED' }
        });

        io.to(tenantId).emit('whatsapp_status', 'DISCONNECTED');
        res.json({ status: 'DISCONNECTED' });
    } catch (e) {
        console.error('[API] Error during disconnect:', e);
        res.status(500).json({ error: 'Falha ao desconectar sessao' });
    }
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



app.post('/api/members/:id/unpause', authMiddleware, async (req: any, res) => {
    try {
        const member = await prisma.member.findFirst({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });

        if (!member) return res.status(404).json({ error: 'Membro não encontrado' });

        await prisma.member.update({
            where: { id: member.id },
            data: { bot_paused: false }
        });

        // Notify member via WhatsApp that automatic service is resumed
        const cleanPhone = member.phone.replace(/\D/g, '');
        const jid = member.whatsapp_jid || `${cleanPhone}@s.whatsapp.net`;

        try {
            await sendMessageToJid(req.user.tenant_id, jid, '🤖 *Atendimento Automático Retomado*\n\nO bot voltou a ficar ativo. Se precisar de algo, basta escolher uma opção do menu ou digitar *Menu*.');
        } catch (e) {
            console.warn('[API] Could not send unpause notification via WhatsApp');
        }

        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
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
    const { name, phone, plan_id, diet, workout, cpf, address } = req.body;

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
    let duration = 30;

    if (plan_id) {
        const plan = await prisma.plan.findUnique({ where: { id: plan_id } });
        if (plan) {
            duration = plan.duration_days;
        }
    }

    planEndDate.setDate(planEndDate.getDate() + duration);
    planEndDate.setHours(23, 59, 59, 999);

    // Normalize phone (remove non-digits)
    const normalizedPhone = phone.replace(/\D/g, '');

    // Check if phone already exists for this tenant
    const existingMember = await prisma.member.findFirst({
        where: {
            tenant_id: req.user.tenant_id,
            phone: normalizedPhone
        }
    });

    if (existingMember) {
        return res.status(400).json({ error: 'Já existe um aluno cadastrado com este telefone.' });
    }

    const member = await prisma.member.create({
        data: {
            name,
            phone: normalizedPhone,
            tenant_id: req.user.tenant_id,
            plan_id: plan_id || undefined,
            plan_start_date: new Date(),
            plan_end_date: planEndDate,
            cpf,
            address,
            diet_plan: diet,
            workout_routine: workout,
            active: true
        }
    });

    // --- AUTO LOGIC: Create Invoice for New Member ---
    if (plan_id) {
        const plan = await prisma.plan.findUnique({ where: { id: plan_id } });
        if (plan) {
            await prisma.invoice.create({
                data: {
                    member_id: member.id,
                    tenant_id: req.user.tenant_id,
                    amount: plan.price,
                    description: `Mensalidade: ${plan.name}`,
                    due_date: planEndDate, // Vence no fim do período (30 dias ou duração do plano)
                    status: 'PENDING'
                }
            });
        }
    }

    res.json(member);
});

// --- APPOINTMENTS ROUTES ---
app.get('/api/appointments', authMiddleware, async (req: any, res) => {
    try {
        const { date } = req.query;
        let where: any = { tenant_id: req.user.tenant_id };

        if (date) {
            const startOfDay = new Date(date as string);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date as string);
            endOfDay.setHours(23, 59, 59, 999);
            where.dateTime = {
                gte: startOfDay,
                lte: endOfDay
            };
        }

        const appointments = await prisma.appointment.findMany({
            where,
            include: { member: true },
            orderBy: { dateTime: 'asc' }
        });
        res.json(appointments);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/appointments', authMiddleware, async (req: any, res) => {
    try {
        const { member_id, dateTime, type, notes } = req.body;
        if (!member_id || !dateTime) {
            return res.status(400).json({ error: 'Membro e data/hora são obrigatórios.' });
        }

        const appointment = await prisma.appointment.create({
            data: {
                tenant_id: req.user.tenant_id,
                member_id,
                dateTime: new Date(dateTime),
                type: type || 'TREINO',
                notes,
                status: 'PENDING'
            },
            include: { member: true }
        });
        res.json(appointment);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/appointments/:id', authMiddleware, async (req: any, res) => {
    try {
        const { status, dateTime, notes, type } = req.body;
        const updated = await prisma.appointment.update({
            where: { id: req.params.id, tenant_id: req.user.tenant_id },
            data: {
                status,
                dateTime: dateTime ? new Date(dateTime) : undefined,
                notes,
                type
            }
        });
        res.json(updated);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/appointments/:id', authMiddleware, async (req: any, res) => {
    try {
        await prisma.appointment.delete({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- MEMBER SCHEDULES (FIXED TIMES) ROUTES ---
app.get('/api/schedules', authMiddleware, async (req: any, res) => {
    try {
        const { day } = req.query; // dayOfWeek 0-6
        let where: any = { tenant_id: req.user.tenant_id };

        if (day !== undefined) {
            where.day_of_week = parseInt(day as string);
        }

        const schedules = await prisma.memberSchedule.findMany({
            where,
            include: { member: true },
            orderBy: { start_time: 'asc' }
        });
        res.json(schedules);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/schedules', authMiddleware, async (req: any, res) => {
    try {
        const { member_id, day_of_week, start_time, type } = req.body;
        if (member_id === undefined || day_of_week === undefined || !start_time) {
            return res.status(400).json({ error: 'Membro, dia da semana e horário são obrigatórios.' });
        }

        const schedule = await prisma.memberSchedule.create({
            data: {
                tenant_id: req.user.tenant_id,
                member_id,
                day_of_week: parseInt(day_of_week),
                start_time,
                type: type || 'TREINO'
            },
            include: { member: true }
        });
        res.json(schedule);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/schedules/:id', authMiddleware, async (req: any, res) => {
    try {
        await prisma.memberSchedule.delete({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/members/:id', authMiddleware, async (req: any, res) => {
    try {
        const { name, phone, plan_id, diet, workout, cpf, address } = req.body;

        const member = await prisma.member.findFirst({
            where: { id: req.params.id, tenant_id: req.user.tenant_id }
        });

        if (!member) return res.status(404).json({ error: 'Membro não encontrado' });

        // Calculate new end date if plan is changed
        let plan_end_date = member.plan_end_date;
        if (plan_id !== undefined && plan_id !== member.plan_id) {
            let duration = 30;
            if (plan_id) {
                const plan = await prisma.plan.findUnique({ where: { id: plan_id } });
                if (plan) duration = plan.duration_days;
            }
            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + duration);
            newEndDate.setHours(23, 59, 59, 999);
            plan_end_date = newEndDate;
        }

        // Normalize phone (remove non-digits)
        const normalizedPhone = phone ? phone.replace(/\D/g, '') : member.phone;

        // Check if phone is being changed and if it already exists for another member
        if (phone && normalizedPhone !== member.phone) {
            const existingMember = await prisma.member.findFirst({
                where: {
                    tenant_id: req.user.tenant_id,
                    phone: normalizedPhone,
                    NOT: { id: member.id }
                }
            });

            if (existingMember) {
                return res.status(400).json({ error: 'Já existe outro aluno cadastrado com este telefone.' });
            }
        }

        const updated = await prisma.member.update({
            where: { id: member.id },
            data: {
                name,
                phone: normalizedPhone,
                plan_id: plan_id || null, // Handle empty string as null
                plan_end_date,
                cpf,
                address,
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

    await prisma.$transaction([
        prisma.invoice.deleteMany({ where: { member_id: member.id } }),
        prisma.accessLog.deleteMany({ where: { member_id: member.id } }),
        prisma.appointment.deleteMany({ where: { member_id: member.id } }),
        prisma.memberSchedule.deleteMany({ where: { member_id: member.id } }),
        prisma.workout.deleteMany({ where: { member_id: member.id } }),
        prisma.member.delete({ where: { id: member.id } })
    ]);
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
    console.log(`[API] Fetched ${logs.length} logs for tenant ${req.user.tenant_id}`);
    res.json(logs);
});

// --- FINANCE ENDPOINTS ---
app.get('/api/finance/stats', authMiddleware, async (req: any, res) => {
    const tenantId = req.user.tenant_id;

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const paidThisMonth = await prisma.invoice.aggregate({
        where: {
            tenant_id: tenantId,
            status: 'PAID',
            paid_at: { gte: firstDayOfMonth }
        },
        _sum: { amount: true }
    });

    const pending = await prisma.invoice.aggregate({
        where: {
            tenant_id: tenantId,
            status: 'PENDING'
        },
        _sum: { amount: true }
    });

    const overdue = await prisma.invoice.aggregate({
        where: {
            tenant_id: tenantId,
            status: 'PENDING',
            due_date: { lt: now }
        },
        _sum: { amount: true }
    });

    res.json({
        monthly_income: paidThisMonth._sum.amount || 0,
        pending_amount: pending._sum.amount || 0,
        overdue_amount: overdue._sum.amount || 0
    });
});

app.get('/api/finance/invoices', authMiddleware, async (req: any, res) => {
    const invoices = await prisma.invoice.findMany({
        where: { tenant_id: req.user.tenant_id },
        include: { member: true },
        orderBy: { due_date: 'desc' },
        take: 100
    });
    res.json(invoices);
});

app.post('/api/finance/invoices/:id/pay', authMiddleware, async (req: any, res) => {
    const { method } = req.body;
    const invoice = await prisma.invoice.findFirst({
        where: { id: req.params.id, tenant_id: req.user.tenant_id }
    });

    if (!invoice) return res.status(404).json({ error: 'Fatura não encontrada' });

    const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
            status: 'PAID',
            paid_at: new Date(),
            payment_method: method || 'CASH'
        }
    });

    res.json(updated);
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

app.get('/api/gate/download-bridge', authMiddleware, async (req: any, res) => {
    const tenantId = req.user.tenant_id;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant || !tenant.gate_token) return res.status(404).json({ error: 'Configuração não encontrada' });

    const templatePath = path.resolve('templates/ZappBridge.js');
    if (!fs.existsSync(templatePath)) {
        return res.status(500).json({ error: 'Template não encontrado no servidor' });
    }

    let content = fs.readFileSync(templatePath, 'utf8');

    // Injetar dados reais no arquivo para o cliente
    content = content.replace('SEU_TOKEN_AQUI', tenant.gate_token);
    content = content.replace('SEU_ID_DA_ACADEMIA', tenantId);
    content = content.replace('https://zapp.fitness', process.env.API_URL || 'https://zapp.fitness');
    content = content.replace('MARCA_DA_CATRACA', tenant.turnstile_brand || 'generic');

    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Content-Disposition', `attachment; filename=ZappBridge_${tenant.slug}.js`);
    res.send(content);
});

app.get('/api/gate/download-installer', authMiddleware, async (req: any, res) => {
    const tenantId = req.user.tenant_id;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant || !tenant.gate_token) return res.status(404).json({ error: 'Configuração não encontrada' });

    const templatePath = path.resolve('templates/ZappBridge.js');
    if (!fs.existsSync(templatePath)) {
        return res.status(500).json({ error: 'Template não encontrado no servidor' });
    }

    let bridgeContent = fs.readFileSync(templatePath, 'utf8');
    bridgeContent = bridgeContent.replace('SEU_TOKEN_AQUI', tenant.gate_token);
    bridgeContent = bridgeContent.replace('SEU_ID_DA_ACADEMIA', tenantId);
    bridgeContent = bridgeContent.replace('https://zapp.fitness', process.env.API_URL || 'https://zapp.fitness');
    bridgeContent = bridgeContent.replace('MARCA_DA_CATRACA', tenant.turnstile_brand || 'generic');

    const packageJson = JSON.stringify({
        name: "zapp-fitness-bridge",
        version: "1.0.0",
        description: "Integration bridge for ZapFitness Turnstiles",
        main: "ZappBridge.js",
        dependencies: {
            "socket.io-client": "^4.7.2",
            "axios": "^1.6.0"
        }
    }, null, 2);

    const batFile = `@echo off
title ZapFitness Bridge - Iniciando...
echo ==========================================
echo    ZAPFITNESS - INTEGRACAO DE HARDWARE
echo ==========================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado! 
    echo Por favor, instale o Node.js antes de continuar em: https://nodejs.org/
    pause
    exit
)

if not exist node_modules (
    echo [1/2] Instalando dependencias pela primeira vez...
    call npm install
)

echo [2/2] Iniciando Bridge...
echo.
node ZappBridge.js
pause`;

    const zip = new AdmZip();
    zip.addFile("ZappBridge.js", Buffer.from(bridgeContent, "utf8"));
    zip.addFile("package.json", Buffer.from(packageJson, "utf8"));
    zip.addFile("iniciar_ponte.bat", Buffer.from(batFile, "utf8"));

    const zipBuffer = zip.toBuffer();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=ZappBridge_Installer_${tenant.slug}.zip`);
    res.send(zipBuffer);
});

app.get('/api/gate/guide', authMiddleware, async (req: any, res) => {
    // Retorna um guia simples em markdown ou texto
    const guide = `
# Guia de Instalação ZappBridge

1. Certifique-se de ter o **Node.js** instalado no computador da recepção.
2. Baixe o arquivo \`ZappBridge.js\` através do painel.
3. Coloque o arquivo em uma pasta dedicada (ex: C:\\ZapFitness).
4. Abra o terminal (CMD) nessa pasta e execute:
   \`npm install socket.io-client\`
5. Para iniciar o monitoramento, execute:
   \`node ZappBridge.js\`
6. A catraca estará pronta para receber comandos do WhatsApp!
    `;
    res.json({ guide });
});

// --- PUSH GATE ENDPOINT (For Control iD and other webhooks) ---
app.all('/api/gate', async (req, res) => {
    // Simple response to verify server is active for hardware
    console.log(`[Gate] Activity on /api/gate from ${req.ip}`);
    res.status(200).send("ZapFitness Gate API - Active");
});

io.on('connection', (socket: any) => {
    console.log(`[IO] socket connected id=${socket.id}, handshake.query=${JSON.stringify(socket.handshake.query)}`);

    socket.on('join_room', async ({ room, token }: { room: string, token?: string }) => {
        try {
            console.log(`[IO] socket ${socket.id} requested join_room=${room}`);

            // Se for uma conexão do Painel (Dashboard), o usuário já está logado via JWT no login.
            // Para o ZappBridge (externo), validamos o gate_token.
            if (token) {
                const tenant = await prisma.tenant.findUnique({ where: { id: room, gate_token: token } });
                if (!tenant) {
                    console.warn(`[IO] Tentativa de conexão INVÁLIDA para sala ${room} com token ${token}`);
                    socket.emit('error', 'Token de acesso inválido');
                    return;
                }
            }

            socket.join(room);
            console.log(`[IO] socket ${socket.id} joined room=${room} (Authenticated)`);

            // Immediately send current status and any pending QR code
            const { getLatestQR, getSession } = await import('./whatsappManager.js');
            const pendingQr = getLatestQR(room);
            if (pendingQr) {
                socket.emit('qr_code', pendingQr);
            }

            const activeSession = getSession(room);
            if (activeSession?.user) {
                socket.emit('whatsapp_status', 'CONNECTED');
            }

            socket.emit('joined_room', { room, socketId: socket.id });
        } catch (err) {
            console.error('[IO] Error on join_room:', err);
        }
    });

    socket.on('disconnect', (reason: any) => {
        console.log(`[IO] socket ${socket.id} disconnected: ${reason}`);
    });
});

// --- TURNSTILE & CHAT INTEGRATION ---
eventBus.on(EVENTS.NEW_MESSAGE, (msg) => {
    io.to(msg.tenant_id).emit('new_message', msg);
});

eventBus.on(EVENTS.ATTENDANCE_REQUESTED, (data) => {
    io.to(data.tenantId).emit('attendance:requested', data);
});

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
        memberName: data.memberName,
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
        return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = jwt.sign({ id: admin.id, email: admin.email, role: 'SAAS_OWNER' }, JWT_SECRET, { expiresIn: '365d' });
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
    if (!tenant) return res.status(404).json({ error: 'Academia não encontrada' });

    const newStatus = tenant.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';

    if (newStatus === 'BLOCKED') {
        const session = getSession(tenant.id);
        if (session) {
            session.end(undefined);
            // sessions.delete(tenant.id); -> handled by connection.update
        }
        await prisma.tenant.update({ where: { id: tenant.id }, data: { whatsapp_status: 'DISCONNECTED', status: 'BLOCKED' } });
    } else {
        await prisma.tenant.update({ where: { id: tenant.id }, data: { status: 'ACTIVE', payment_status: 'ACTIVE' } });
    }

    res.json({ status: newStatus });
});

// Update Tenant
app.put('/api/saas/tenants/:id', saasAuthMiddleware, async (req: any, res) => {
    try {
        const { name, owner_phone, is_free, saas_plan_expires_at } = req.body;
        const updated = await prisma.tenant.update({
            where: { id: req.params.id },
            data: {
                name,
                owner_phone,
                is_free,
                saas_plan_expires_at: saas_plan_expires_at ? new Date(saas_plan_expires_at) : undefined
            }
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
    const { name, price, max_members, duration_months, description, features } = req.body;
    try {
        if (!name || isNaN(parseFloat(price)) || isNaN(parseInt(max_members)) || isNaN(parseInt(duration_months))) {
            return res.status(400).json({ error: 'Nome, preço, limite de membros e duração são obrigatórios.' });
        }

        const plan = await prisma.saasPlan.create({
            data: {
                name,
                price: parseFloat(price),
                max_members: parseInt(max_members),
                duration_months: parseInt(duration_months),
                description: description || '',
                features: Array.isArray(features) ? JSON.stringify(features) : JSON.stringify(['Suporte WhatsApp', 'Check-in QR Code'])
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

// --- SAAS FINANCE ---
app.get('/api/saas/finance', saasAuthMiddleware, async (req, res) => {
    try {
        const payments = await prisma.paymentHistory.findMany({
            include: { tenant: { select: { name: true } } },
            orderBy: { created_at: 'desc' },
            take: 100
        });

        // Calculate totals
        const totalRevenue = await prisma.paymentHistory.aggregate({
            where: { status: 'PAID' },
            _sum: { amount: true }
        });

        const pendingRevenue = await prisma.paymentHistory.aggregate({
            where: { status: 'PENDING' },
            _sum: { amount: true }
        });

        res.json({
            payments,
            summary: {
                total_revenue: totalRevenue._sum.amount || 0,
                pending_revenue: pendingRevenue._sum.amount || 0
            }
        });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: 'Erro ao buscar dados financeiros' });
    }
});

// Update Tenant Admin Credentials
app.put('/api/saas/tenants/:id/admin', saasAuthMiddleware, async (req: any, res) => {
    try {
        const { email, password, name } = req.body;
        const tenantId = req.params.id;

        // Find the admin associated with this tenant
        const admin = await prisma.gymAdmin.findFirst({ where: { tenant_id: tenantId } });

        if (!admin) return res.status(404).json({ error: 'Administrador não encontrado para esta academia' });

        const data: any = {};
        if (email) data.email = email;
        if (name) data.name = name;
        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }

        const updated = await prisma.gymAdmin.update({
            where: { id: admin.id },
            data
        });

        res.json({ success: true, admin: { id: updated.id, email: updated.email, name: updated.name } });
    } catch (e: any) {
        res.status(400).json({ error: 'Erro ao atualizar administrador: ' + e.message });
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
                const payment = await getLatestPayment(subscription.id);
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
        const payment = await getLatestPayment(tenant.subscription_id);

        // Access is ONLY granted if the latest payment is confirmed/received
        const isPaid = payment && (payment.status === 'CONFIRMED' || payment.status === 'RECEIVED');

        // If payment confirmed, update DB and unblock tenant
        if (isPaid && tenant.payment_status !== 'ACTIVE') {
            await prisma.tenant.update({
                where: { id: tenant.id },
                data: {
                    payment_status: 'ACTIVE',
                    status: 'ACTIVE'
                }
            });
        }
        res.json({
            status: isPaid ? 'ACTIVE' : (payment?.status || sub.status),
            subscription: sub,
            payment
        });
    } catch (e) {
        res.status(400).json({ error: 'Erro ao buscar assinatura' });
    }
});

// Endpoint to get Pix QR Code for the current pending payment of the subscription
// Webhook do Asaas
app.post('/api/webhook/asaas', async (req, res) => {
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

// --- 6. CATCH-ALL ROUTE (SPA HANDLING) ---
app.get('*', (req, res) => {
    // Se a requisição não for para API e não for arquivo estático (já tratado), serve index.html
    const publicDir = path.join(__dirname, '../public');
    const indexHtml = path.join(publicDir, 'index.html');

    console.log(`[Debug] CWD: ${process.cwd()}`);
    console.log(`[Debug] Public Dir resolved to: ${publicDir}`);
    if (fs.existsSync(publicDir)) {
        console.log(`[Debug] Public dir contents:`, fs.readdirSync(publicDir));
    } else {
        console.log(`[Debug] Public dir does not exist!`);
    }

    if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
    } else {
        res.status(404).json({
            error: 'Frontend não encontrado/compilado',
            cwd: process.cwd(),
            publicDir: publicDir,
            exists: fs.existsSync(publicDir)
        });
    }
});

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
        await reconnectSessions();

        console.log(`>>> Server is fully ready and listening!`);
    } catch (error) {
        console.error('!!! FAILED TO STARTUP SERVER:', error);
        // Don't kill the process, let it try to recover or stay alive for logs
    }
});


