
import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTutorial } from '../contexts/TutorialContext';
import { LayoutDashboard, Users, Activity, Settings, Zap, Bell, Cpu, CreditCard, HelpCircle, MoreHorizontal, Calendar, TrendingUp, Sparkles, Brain, AlertCircle, MessageSquare, LogOut, RefreshCw, ArrowUpRight, UserPlus, WalletCards, CalendarPlus, Wifi, CheckCircle2 } from 'lucide-react';
import { WhatsAppConnect } from './WhatsAppConnect';
import { Turnstiles } from './Turnstiles';
import { Finance } from './Finance';
import { Members } from './Members';
import { Plans } from './Plans';
import { AccessLogs } from './AccessLogs';
import { ProfileSettings } from './ProfileSettings';
import { Appointments } from './Appointments';
import { Exercises } from './Exercises';
import { Chat } from './Chat';

import clsx from 'clsx';
import api from '../api';
import { formatImageUrl } from '../utils/format';
import { NotificationHandler } from '../components/NotificationHandler';

export const Dashboard = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { startTutorial, hasSeenTutorial } = useTutorial();
    const [systemSettings, setSystemSettings] = React.useState({ site_name: 'ZapFitness', logo_url: '' });

    React.useEffect(() => {
        // Start the general dashboard tutorial if not seen
        requestAnimationFrame(() => {
            if (!hasSeenTutorial('dashboard')) {
                startTutorial('dashboard');
            }
        });
        api.get('/system/settings').then(res => setSystemSettings(res.data)).catch(console.error);
    }, [hasSeenTutorial, startTutorial]);



    const navItems = [
        { label: 'ATENDIMENTO', path: '/dashboard/chat', icon: MessageSquare },
        { label: 'PLANOS', path: '/dashboard/plans', icon: Activity },
        { label: 'AGENDA', path: '/dashboard/appointments', icon: Calendar },
        { label: 'MEMBROS', path: '/dashboard/members', icon: Users },
        { label: 'EXERCÍCIOS', path: '/dashboard/exercises', icon: Activity }, // Use Activity or Dumbbell
        { label: 'ACESSOS', path: '/dashboard/logs', icon: Activity },
        { label: 'FINANCEIRO', path: '/dashboard/finance', icon: CreditCard },
        { label: 'CATRACAS', path: '/dashboard/turnstiles', icon: Cpu },
        { label: 'WHATSAPP', path: '/dashboard/whatsapp', icon: Zap },

        { label: 'CONFIGURAÇÕES', path: '/dashboard/settings', icon: Settings },
    ];

    const filteredNavItems = navItems.filter(item => {
        if (item.label === 'Agenda' && !user?.enable_scheduling) return false;
        return true;
    });

    const currentItem = filteredNavItems.find(item => item.path === location.pathname) || filteredNavItems[0];

    return (
        <div className="flex h-dvh min-h-0 min-w-0 bg-slate-50 overflow-hidden">
            <NotificationHandler />
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-72 shrink-0 bg-slate-950 text-white flex-col shadow-2xl z-20">
                <div className="p-8 border-b border-slate-800">
                    <div className="flex items-center gap-3 px-1 mb-10 group cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 bg-white">
                            {user?.logo_url ? (
                                <img src={formatImageUrl(user.logo_url)} alt="Gym Logo" className="w-full h-full object-contain p-1" />
                            ) : systemSettings.logo_url ? (
                                <img src={formatImageUrl(systemSettings.logo_url)} alt="SaaS Logo" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center shadow-primary/30">
                                    <Zap className="text-white fill-white" size={20} />
                                </div>
                            )}
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-white truncate max-w-[180px]">
                            {user?.name || (systemSettings.site_name === 'ZapFitness' ? (
                                <>Zapp<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">Fitness</span></>
                            ) : (
                                systemSettings.site_name
                            ))}
                        </span>
                    </div>
                </div>

                <nav id="sidebar-nav" className="flex-1 p-6 space-y-2 overflow-y-auto">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 px-4">Menu Principal</p>
                    {filteredNavItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 group",
                                location.pathname === item.path
                                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                                    : "text-slate-500 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon size={20} className={clsx(location.pathname === item.path ? "scale-110" : "group-hover:scale-110 transition-transform")} />
                            <span className="font-bold text-sm tracking-wide">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-6 border-t border-white/5 bg-slate-950/50">
                    <div className="flex items-center gap-4 p-5 rounded-[2.5rem] bg-white/5 border border-white/5 mb-6">
                        <div className="w-14 h-14 rounded-[1.5rem] bg-white shadow-lg flex items-center justify-center font-bold text-slate-900 shadow-inner overflow-hidden flex-shrink-0 border-2 border-white/10">
                            {user?.logo_url ? (
                                <img src={formatImageUrl(user.logo_url)} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <Zap className="text-primary" size={28} />
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-base font-black text-white truncate uppercase tracking-tighter">{user?.name || 'Academia'}</p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest whitespace-nowrap">Conectado Live</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => {
                            const path = location.pathname;
                            let tutorialId = 'dashboard';
                            if (path.includes('/members')) tutorialId = 'members';
                            else if (path.includes('/plans')) tutorialId = 'plans';
                            else if (path.includes('/finance')) tutorialId = 'finance';
                            else if (path.includes('/turnstiles')) tutorialId = 'turnstiles';
                            else if (path.includes('/logs')) tutorialId = 'access_logs';
                            else if (path.includes('/whatsapp')) tutorialId = 'whatsapp';

                            startTutorial(tutorialId);
                        }} className="flex items-center justify-center p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-500 hover:text-white transition-all group border border-white/5">
                            <HelpCircle size={18} className="group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm('Deseja realmente sair?')) {
                                    logout();
                                    navigate('/');
                                }
                            }}
                            className="flex items-center justify-center p-4 bg-red-500/10 hover:bg-red-500/20 rounded-2xl text-red-500 transition-all group border border-red-500/10"
                            title="Sair"
                        >
                            <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col h-full overflow-hidden relative">

                {/* Mobile Top Header */}
                <header className="md:hidden bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-md overflow-hidden">
                            {user?.logo_url ? (
                                <img src={formatImageUrl(user.logo_url)} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <Zap className="text-white fill-white" size={16} />
                            )}
                        </div>
                        <h1 className="text-lg font-black text-slate-900 tracking-tight truncate max-w-[150px]">{user?.name || currentItem.label}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" className="p-2 text-slate-500 hover:text-primary transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shadow-sm overflow-hidden">
                            {user?.logo_url ? (
                                <img src={formatImageUrl(user.logo_url)} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                user?.name?.charAt(0) || 'A'
                            )}
                        </div>
                    </div>
                </header>

                <header className="hidden md:flex bg-white border-b border-slate-100 px-12 py-6 items-center justify-between z-10">
                    <div className="flex items-center gap-6">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{currentItem.label}</h2>
                        <div className="flex items-center gap-3 px-5 py-2 bg-primary/5 rounded-full border border-primary/10">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary-color)]"></div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] whitespace-nowrap">IA NIVEL: MÁXIMO ATIVADO</span>
                        </div>
                    </div>
                    <div id="header-profile" className="flex items-center gap-4">
                        <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                    </div>
                </header>

                {/* Content Container */}
                <main id="main-content" className="flex-1 min-w-0 overflow-y-auto overscroll-contain min-h-0 pb-32 md:pb-8 touch-pan-y">
                    <div className="w-full min-w-0 p-4 md:p-10 max-w-7xl mx-auto">
                        <Routes>
                            <Route path="/" element={<Welcome />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/plans" element={<Plans />} />
                            <Route path="/appointments" element={<Appointments />} />
                            <Route path="/members" element={<Members />} />
                            <Route path="/exercises" element={<Exercises />} />
                            <Route path="/logs" element={<AccessLogs />} />
                            <Route path="/finance" element={<Finance />} />
                            <Route path="/turnstiles" element={<Turnstiles />} />
                            <Route path="/whatsapp" element={<WhatsAppConnect />} />

                            <Route path="/settings" element={<ProfileSettings />} />
                        </Routes>
                    </div>
                </main>

                {/* --- PROFESSIONAL MOBILE SMART DOCK --- */}
                <div className="md:hidden pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-50">
                    <nav className="pointer-events-auto bg-slate-900/90 backdrop-blur-xl border border-white/10 p-2 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-primary/20">
                        {/* Primary Items (Top 4) */}
                        {[
                            { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
                            { label: 'Chat', path: '/dashboard/chat', icon: MessageSquare },
                            ...(user?.enable_scheduling ? [{ label: 'Agenda', path: '/dashboard/appointments', icon: Calendar }] : []),
                            { label: 'Whats', path: '/dashboard/whatsapp', icon: Zap },

                        ].map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={clsx(
                                        "relative flex flex-col items-center justify-center py-2 px-1 transition-all duration-300 flex-1",
                                        isActive ? "text-primary" : "text-white/40 hover:text-white/60"
                                    )}
                                >
                                    <div className={clsx(
                                        "p-2.5 rounded-2xl transition-all duration-500",
                                        isActive ? "bg-primary/10 scale-110" : "bg-transparent"
                                    )}>
                                        <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                    </div>
                                    <span className={clsx(
                                        "text-[9px] font-black uppercase tracking-widest mt-1 scale-90",
                                        isActive ? "opacity-100" : "opacity-0 invisible h-0"
                                    )}>
                                        {item.label}
                                    </span>
                                    {isActive && (
                                        <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_var(--primary-color)]" />
                                    )}
                                </Link>
                            );
                        })}

                        {/* Expand Button */}
                        <button
                            type="button"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className={clsx(
                                "flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all duration-300 flex-1",
                                isMobileMenuOpen ? "text-primary bg-primary/10 scale-110 rotate-90" : "text-white/40"
                            )}
                        >
                            <MoreHorizontal size={24} />
                            <span className={clsx(
                                "text-[9px] font-black uppercase tracking-widest mt-1 scale-90",
                                isMobileMenuOpen ? "opacity-100" : "opacity-0 invisible h-0"
                            )}>
                                Mais
                            </span>
                        </button>
                    </nav>

                    {/* Expandable Menu Overlay (Glassmorphism Modal) */}
                    {isMobileMenuOpen && (
                        <div className="pointer-events-auto absolute bottom-20 left-0 right-0 animate-fade-in-up">
                            <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-6 shadow-2xl grid grid-cols-3 gap-6">
                                {[
                                    { label: 'Membros', path: '/dashboard/members', icon: Users },
                                    { label: 'Treinos', path: '/dashboard/exercises', icon: Activity },
                                    { label: 'Planos', path: '/dashboard/plans', icon: Activity },
                                    { label: 'Acessos', path: '/dashboard/logs', icon: Activity },
                                    { label: 'Dinheiro', path: '/dashboard/finance', icon: CreditCard },
                                    { label: 'Catracas', path: '/dashboard/turnstiles', icon: Cpu },
                                    { label: 'Ajustes', path: '/dashboard/settings', icon: Settings },
                                ].map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/60 group-hover:bg-orange-500/20 group-hover:text-orange-500 transition-all border border-white/5">
                                            <item.icon size={24} />
                                        </div>
                                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest text-center">{item.label}</span>
                                    </Link>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm('Deseja realmente sair?')) {
                                            logout();
                                            navigate('/');
                                        }
                                    }}
                                    className="flex flex-col items-center gap-2 group"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500/20 transition-all border border-red-500/10">
                                        <LogOut size={24} />
                                    </div>
                                    <span className="text-[10px] font-black text-red-500/60 uppercase tracking-widest text-center">Sair</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Overlay Background to close menu */}
                {isMobileMenuOpen && (
                    <div
                        className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in pointer-events-auto"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};

interface DashboardMemberSummary {
    id?: string;
    name?: string;
    active?: boolean;
    plan_end_date?: string | null;
}

interface DashboardAccessSummary {
    scanned_at?: string;
    status?: string;
    member_id?: string | null;
}

interface DashboardAppointmentSummary {
    dateTime?: string;
    status?: string;
    type?: string;
    member?: { name?: string } | null;
}

interface DashboardTenantSummary {
    name?: string;
    whatsapp_status?: string;
}

interface DashboardSnapshot {
    members: {
        total: number;
        active: number;
        expiring: number;
        expired: number;
        atRisk: number;
        atRiskNames: string[];
    };
    finance: {
        monthly_income: number;
        pending_amount: number;
        overdue_amount: number;
    };
    access: {
        today: number;
        granted: number;
        uniqueMembers: number;
    };
    nextAppointment: DashboardAppointmentSummary | null;
    whatsappStatus: string;
    operationalScore: number;
    recommendation: {
        title: string;
        description: string;
        actionLabel: string;
        path: string;
    };
}

const EMPTY_DASHBOARD_SNAPSHOT: DashboardSnapshot = {
    members: { total: 0, active: 0, expiring: 0, expired: 0, atRisk: 0, atRiskNames: [] },
    finance: { monthly_income: 0, pending_amount: 0, overdue_amount: 0 },
    access: { today: 0, granted: 0, uniqueMembers: 0 },
    nextAppointment: null,
    whatsappStatus: 'DISCONNECTED',
    operationalScore: 0,
    recommendation: {
        title: 'Configure sua operação',
        description: 'Assim que seus dados estiverem disponíveis, o radar indicará a próxima melhor ação.',
        actionLabel: 'Abrir membros',
        path: '/dashboard/members'
    }
};

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2
}).format(Number(value) || 0);

const formatToday = () => new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
}).format(new Date());

const formatRefreshTime = (date: Date | null) => date
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';

const Welcome = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [tenant, setTenant] = React.useState<DashboardTenantSummary | null>(null);
    const [snapshot, setSnapshot] = React.useState<DashboardSnapshot>(EMPTY_DASHBOARD_SNAPSHOT);
    const [loading, setLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);
    const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

    const loadDashboard = React.useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const nextSevenDays = new Date(todayStart);
        nextSevenDays.setDate(nextSevenDays.getDate() + 7);
        const dateParam = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const results = await Promise.allSettled([
            api.get('/me'),
            api.get('/members'),
            api.get('/finance/stats'),
            api.get('/logs'),
            user?.enable_scheduling ? api.get('/appointments', { params: { date: dateParam } }) : Promise.resolve({ data: [] })
        ]);

        const getData = <T,>(index: number, fallback: T): T => {
            const result = results[index];
            return result?.status === 'fulfilled' ? result.value.data as T : fallback;
        };

        const members = getData<DashboardMemberSummary[]>(1, []);
        const finance = getData<DashboardSnapshot['finance']>(2, EMPTY_DASHBOARD_SNAPSHOT.finance);
        const logs = getData<DashboardAccessSummary[]>(3, []);
        const appointments = getData<DashboardAppointmentSummary[]>(4, []);
        const now = new Date();
        const activeMembers = members.filter(member => {
            if (!member.active || !member.plan_end_date) return false;
            return new Date(member.plan_end_date) > now;
        });
        const expiringMembers = activeMembers.filter(member => {
            const endDate = new Date(member.plan_end_date as string);
            return endDate <= nextSevenDays;
        });
        const expiredMembers = members.filter(member => !member.active || !member.plan_end_date || new Date(member.plan_end_date) <= now);
        const todayLogs = logs.filter(log => log.scanned_at && new Date(log.scanned_at) >= todayStart);
        const grantedLogs = todayLogs.filter(log => log.status === 'GRANTED');
        const uniqueAccessMembers = new Set(grantedLogs.map(log => log.member_id).filter(Boolean));
        const lastAccessByMember = new Map<string, Date>();
        logs.filter(log => log.status === 'GRANTED' && log.member_id && log.scanned_at).forEach(log => {
            const lastAccess = lastAccessByMember.get(log.member_id as string);
            const scannedAt = new Date(log.scanned_at as string);
            if (!lastAccess || scannedAt > lastAccess) lastAccessByMember.set(log.member_id as string, scannedAt);
        });
        const atRiskMembers = activeMembers.filter(member => {
            if (!member.id) return false;
            const lastAccess = lastAccessByMember.get(member.id);
            return !lastAccess || (now.getTime() - lastAccess.getTime()) > 10 * 24 * 60 * 60 * 1000;
        });
        const nextAppointment = appointments
            .filter(appointment => appointment.dateTime && new Date(appointment.dateTime) >= now && appointment.status !== 'CANCELLED')
            .sort((a, b) => new Date(a.dateTime as string).getTime() - new Date(b.dateTime as string).getTime())[0] || null;

        const tenantData = getData<DashboardTenantSummary>(0, {});
        const isWhatsappConnected = tenantData.whatsapp_status === 'CONNECTED';
        const baseReadiness = activeMembers.length > 0 ? Math.round((activeMembers.length / Math.max(members.length, 1)) * 35) : 0;
        const accessReadiness = activeMembers.length > 0 ? Math.min(25, Math.round((uniqueAccessMembers.size / activeMembers.length) * 25)) : 0;
        const whatsappReadiness = isWhatsappConnected ? 20 : 0;
        const billingReadiness = finance.overdue_amount > 0 ? 8 : 20;
        const operationalScore = Math.min(100, baseReadiness + accessReadiness + whatsappReadiness + billingReadiness);
        const recommendation = expiringMembers.length > 0
            ? {
                title: 'Proteja a próxima receita',
                description: `${expiringMembers.length} ${expiringMembers.length === 1 ? 'aluno está' : 'alunos estão'} perto de renovar. Antecipe o contato enquanto o relacionamento está ativo.`,
                actionLabel: 'Ver renovações',
                path: '/dashboard/members'
            }
            : finance.overdue_amount > 0
                ? {
                    title: 'Recupere pagamentos em atraso',
                    description: `${formatCurrency(finance.overdue_amount)} em cobranças vencidas merecem atenção hoje.`,
                    actionLabel: 'Abrir financeiro',
                    path: '/dashboard/finance'
                }
                : atRiskMembers.length > 0
                    ? {
                        title: 'Reative alunos silenciosos',
                        description: `${atRiskMembers.length} ${atRiskMembers.length === 1 ? 'aluno não aparece' : 'alunos não aparecem'} há mais de 10 dias nos acessos registrados.`,
                        actionLabel: 'Ver membros',
                        path: '/dashboard/members'
                    }
                    : !isWhatsappConnected
                        ? {
                            title: 'Conecte o WhatsApp da academia',
                            description: 'Ative o canal para automatizar a recepção e acelerar seus próximos contatos.',
                            actionLabel: 'Conectar agora',
                            path: '/dashboard/whatsapp'
                        }
                        : {
                            title: 'Tudo pronto para hoje',
                            description: 'Sua operação não tem alertas críticos. Acompanhe os acessos para manter o ritmo.',
                            actionLabel: 'Ver acessos',
                            path: '/dashboard/logs'
                        };
        setTenant(tenantData);
        setSnapshot({
            members: {
                total: members.length,
                active: activeMembers.length,
                expiring: expiringMembers.length,
                expired: expiredMembers.length,
                atRisk: atRiskMembers.length,
                atRiskNames: atRiskMembers.map(member => member.name || 'Aluno').slice(0, 3)
            },
            finance: {
                monthly_income: Number(finance.monthly_income) || 0,
                pending_amount: Number(finance.pending_amount) || 0,
                overdue_amount: Number(finance.overdue_amount) || 0
            },
            access: {
                today: todayLogs.length,
                granted: grantedLogs.length,
                uniqueMembers: uniqueAccessMembers.size
            },
            nextAppointment,
            whatsappStatus: tenantData.whatsapp_status || 'DISCONNECTED',
            operationalScore,
            recommendation
        });
        setLastUpdated(new Date());
        setLoading(false);
        setRefreshing(false);
    }, [user?.enable_scheduling]);

    React.useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const activeRate = snapshot.members.total > 0
        ? Math.round((snapshot.members.active / snapshot.members.total) * 100)
        : 0;
    const accessRate = snapshot.members.active > 0
        ? Math.min(100, Math.round((snapshot.access.uniqueMembers / snapshot.members.active) * 100))
        : 0;
    const greetingName = tenant?.name || user?.name || 'sua academia';
    const whatsappConnected = snapshot.whatsappStatus === 'CONNECTED';
    const scoreLabel = snapshot.operationalScore >= 80
        ? 'Operação saudável'
        : snapshot.operationalScore >= 60
            ? 'Atenção preventiva'
            : 'Ação recomendada';
    const scoreTone = snapshot.operationalScore >= 80 ? 'text-emerald-600' : snapshot.operationalScore >= 60 ? 'text-amber-600' : 'text-primary';

    const kpis = [
        {
            label: 'Membros ativos',
            value: loading ? '—' : snapshot.members.active.toString(),
            detail: `${snapshot.members.total} cadastrados`,
            icon: Users,
            tone: 'bg-orange-50 text-primary',
            action: () => navigate('/dashboard/members')
        },
        {
            label: 'Receita no mês',
            value: loading ? '—' : formatCurrency(snapshot.finance.monthly_income),
            detail: 'Pagamentos confirmados',
            icon: TrendingUp,
            tone: 'bg-emerald-50 text-emerald-600',
            action: () => navigate('/dashboard/finance')
        },
        {
            label: 'A receber',
            value: loading ? '—' : formatCurrency(snapshot.finance.pending_amount),
            detail: snapshot.finance.overdue_amount > 0 ? `${formatCurrency(snapshot.finance.overdue_amount)} em atraso` : 'Sem atrasos registrados',
            icon: WalletCards,
            tone: 'bg-blue-50 text-blue-600',
            action: () => navigate('/dashboard/finance')
        },
        {
            label: 'Acessos hoje',
            value: loading ? '—' : snapshot.access.today.toString(),
            detail: `${snapshot.access.granted} liberados`,
            icon: Activity,
            tone: 'bg-violet-50 text-violet-600',
            action: () => navigate('/dashboard/logs')
        }
    ];

    return (
        <div className="animate-fade-in-up min-w-0">
            <div className="mb-8 flex flex-col gap-5 px-4 sm:px-0 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.22em] text-primary">
                        <span className="rounded-full bg-primary/10 px-3 py-1">Central de operações</span>
                        <span className="text-slate-400">{formatToday()}</span>
                    </div>
                    <h1 className="break-words text-3xl font-black tracking-tighter text-slate-900 sm:text-4xl md:text-5xl">
                        Olá, <span className="text-primary">{greetingName}!</span> 👋
                    </h1>
                    <p className="mt-2 max-w-2xl text-base font-medium leading-relaxed text-slate-500 sm:text-lg">Uma visão clara para você cuidar da operação, da receita e da experiência dos seus alunos.</p>
                </div>
                <button
                    type="button"
                    onClick={() => loadDashboard(true)}
                    disabled={refreshing}
                    className="flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:border-primary/30 hover:text-primary disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                >
                    <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                    Atualizar painel
                </button>
            </div>

            <div className="mb-8 grid min-w-0 grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:px-0 xl:grid-cols-4">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                        <button
                            type="button"
                            key={kpi.label}
                            onClick={kpi.action}
                            className="group min-w-0 rounded-[2rem] border border-slate-100 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-slate-200/50 sm:p-6"
                        >
                            <div className="mb-7 flex items-start justify-between gap-3">
                                <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', kpi.tone)}><Icon size={21} /></div>
                                <ArrowUpRight size={17} className="text-slate-300 transition-colors group-hover:text-primary" />
                            </div>
                            <div className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{kpi.label}</div>
                            <div className="mt-2 truncate text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{kpi.value}</div>
                            <div className="mt-2 truncate text-xs font-semibold text-slate-400">{kpi.detail}</div>
                        </button>
                    );
                })}
            </div>

            <div className="mb-8 grid min-w-0 grid-cols-1 gap-6 px-4 sm:px-0 lg:grid-cols-3">
                <div className="relative min-w-0 overflow-hidden rounded-[2.5rem] bg-[#1e293b] p-6 text-white shadow-2xl sm:p-8 lg:col-span-2">
                    <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-[80px]"></div>
                    <div className="relative z-10">
                        <div className="mb-8 flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary"><Brain size={25} /></div>
                                <div className="min-w-0">
                                    <h3 className="truncate text-xl font-black tracking-tight sm:text-2xl">Prioridades da operação</h3>
                                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Ações baseadas nos dados atuais</p>
                                </div>
                            </div>
                            <Sparkles className="hidden shrink-0 text-primary sm:block" size={20} />
                        </div>
                        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="min-w-0 rounded-[2rem] border border-white/5 bg-white/5 p-5 transition-colors hover:bg-white/10 sm:p-6">
                                <div className="mb-3 flex items-center gap-3"><TrendingUp className="shrink-0 text-primary" size={19} /><span className="text-[10px] font-black uppercase tracking-widest text-primary">Oportunidade de receita</span></div>
                                <p className="text-sm font-medium leading-relaxed text-slate-300">Você tem <span className="font-black text-white">{snapshot.members.expiring} alunos</span> com plano vencendo nos próximos 7 dias. Antecipe a renovação para proteger seu faturamento.</p>
                                <button type="button" onClick={() => navigate('/dashboard/members')} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">Ver renovações <ArrowUpRight size={14} /></button>
                            </div>
                            <div className="min-w-0 rounded-[2rem] border border-white/5 bg-white/5 p-5 transition-colors hover:bg-white/10 sm:p-6">
                                <div className="mb-3 flex items-center gap-3"><AlertCircle className="shrink-0 text-orange-400" size={19} /><span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Atenção necessária</span></div>
                                <p className="text-sm font-medium leading-relaxed text-slate-300"><span className="font-black text-white">{snapshot.members.expired} alunos</span> estão sem plano ativo ou com a validade encerrada. Uma revisão rápida evita bloqueios e melhora a experiência.</p>
                                <button type="button" onClick={() => navigate('/dashboard/members')} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-white/20">Revisar alunos <ArrowUpRight size={14} /></button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="min-w-0 rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-8 flex items-center justify-between gap-3"><h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Saúde da academia</h4><Sparkles className="animate-pulse text-primary" size={18} /></div>
                    <div className="space-y-7">
                        <div>
                            <div className="mb-3 flex justify-between gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400"><span>BASE ATIVA</span><span className="text-primary">{activeRate}%</span></div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.4)] transition-all duration-700" style={{ width: `${activeRate}%` }}></div></div>
                        </div>
                        <div>
                            <div className="mb-3 flex justify-between gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400"><span>PRESENÇA HOJE</span><span className="text-primary">{accessRate}%</span></div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.4)] transition-all duration-700" style={{ width: `${accessRate}%` }}></div></div>
                        </div>
                    </div>
                    <div className="mt-8 rounded-3xl border border-blue-100 bg-blue-50/50 p-5">
                        <div className="mb-2 flex items-center gap-2 text-blue-700"><CheckCircle2 size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Leitura operacional</span></div>
                        <p className="text-xs font-bold leading-relaxed text-blue-800">{snapshot.access.uniqueMembers > 0 ? `${snapshot.access.uniqueMembers} membros já passaram pela academia hoje.` : 'Ainda não há acessos liberados registrados hoje.'}</p>
                    </div>
                </div>
            </div>

            <div className="mb-8 grid min-w-0 grid-cols-1 gap-6 px-4 sm:px-0 lg:grid-cols-2">
                <div className="min-w-0 rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-6 flex items-start justify-between gap-3">
                        <div><div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary">Radar da academia</div><h3 className="text-xl font-black tracking-tight text-slate-900">Índice de prontidão</h3><p className="mt-1 text-xs font-medium leading-relaxed text-slate-400">Uma leitura simples dos sinais que movem sua operação.</p></div>
                        <Activity className="shrink-0 text-primary" size={22} />
                    </div>
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                        <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(var(--primary-color) ${snapshot.operationalScore}%, #f1f5f9 0)` }}>
                            <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white"><span className="text-3xl font-black tracking-tighter text-slate-900">{loading ? '—' : snapshot.operationalScore}</span><span className="text-[9px] font-black uppercase tracking-widest text-slate-400">de 100</span></div>
                        </div>
                        <div className="min-w-0 flex-1 w-full">
                            <div className={clsx('mb-4 text-sm font-black', scoreTone)}>{scoreLabel}</div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Base ativa', value: `${activeRate}%`, ok: activeRate >= 80 },
                                    { label: 'Presença', value: `${accessRate}%`, ok: accessRate > 0 },
                                    { label: 'WhatsApp', value: whatsappConnected ? 'OK' : 'Pendente', ok: whatsappConnected },
                                    { label: 'Cobranças', value: snapshot.finance.overdue_amount > 0 ? 'Atraso' : 'Em dia', ok: snapshot.finance.overdue_amount === 0 }
                                ].map(signal => <div key={signal.label} className="min-w-0 rounded-xl bg-slate-50 px-3 py-2"><div className="truncate text-[9px] font-black uppercase tracking-wider text-slate-400">{signal.label}</div><div className={clsx('mt-1 truncate text-xs font-black', signal.ok ? 'text-emerald-600' : 'text-amber-600')}>{signal.value}</div></div>)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="relative min-w-0 overflow-hidden rounded-[2.5rem] bg-[#1e293b] p-6 text-white shadow-2xl sm:p-8">
                    <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-[70px]"></div>
                    <div className="relative z-10 flex h-full min-h-[220px] flex-col">
                        <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary"><Sparkles size={19} /></div><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Próxima melhor ação</div><p className="mt-1 text-xs font-medium text-slate-400">Seu painel priorizou este movimento.</p></div></div>
                        <h3 className="max-w-lg text-2xl font-black leading-tight tracking-tight">{snapshot.recommendation.title}</h3>
                        <p className="mt-3 max-w-lg text-sm font-medium leading-relaxed text-slate-300">{snapshot.recommendation.description}</p>
                        {snapshot.members.atRiskNames.length > 0 && <p className="mt-3 truncate text-xs font-bold text-slate-400">Radar de frequência: {snapshot.members.atRiskNames.join(', ')}{snapshot.members.atRisk > snapshot.members.atRiskNames.length ? ` +${snapshot.members.atRisk - snapshot.members.atRiskNames.length}` : ''}</p>}
                        <button type="button" onClick={() => navigate(snapshot.recommendation.path)} className="mt-auto inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">{snapshot.recommendation.actionLabel} <ArrowUpRight size={14} /></button>
                    </div>
                </div>
            </div>

            <div className="mb-8 grid min-w-0 grid-cols-1 gap-6 px-4 sm:px-0 lg:grid-cols-2">
                <div className="min-w-0 rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-6 flex items-center justify-between gap-3"><div><h3 className="text-xl font-black tracking-tight text-slate-900">Atalhos da operação</h3><p className="mt-1 text-xs font-medium text-slate-400">Chegue às tarefas mais importantes em um toque.</p></div><Zap className="shrink-0 text-primary" size={22} /></div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            { label: 'Novo aluno', icon: UserPlus, path: '/dashboard/members' },
                            { label: 'Financeiro', icon: WalletCards, path: '/dashboard/finance' },
                            { label: 'WhatsApp', icon: MessageSquare, path: '/dashboard/whatsapp' },
                            ...(user?.enable_scheduling ? [{ label: 'Agenda', icon: CalendarPlus, path: '/dashboard/appointments' }] : [])
                        ].map(action => {
                            const Icon = action.icon;
                            return <button type="button" key={action.label} onClick={() => navigate(action.path)} className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 transition-all hover:border-primary/20 hover:bg-primary/5 hover:text-primary"><Icon size={19} /><span className="truncate max-w-full">{action.label}</span></button>;
                        })}
                    </div>
                </div>
                <div className="min-w-0 rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
                    <div className="mb-6 flex items-center justify-between gap-3"><div><h3 className="text-xl font-black tracking-tight text-slate-900">Status da operação</h3><p className="mt-1 text-xs font-medium text-slate-400">O que precisa da sua atenção agora.</p></div><Wifi className={whatsappConnected ? 'text-emerald-500' : 'text-slate-300'} size={22} /></div>
                    <div className="space-y-3">
                        <button type="button" onClick={() => navigate('/dashboard/whatsapp')} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 text-left transition-colors hover:bg-slate-100"><span className="flex min-w-0 items-center gap-3"><span className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', whatsappConnected ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]' : 'bg-slate-300')} /><span className="truncate text-sm font-bold text-slate-700">WhatsApp</span></span><span className={clsx('shrink-0 text-[10px] font-black uppercase tracking-widest', whatsappConnected ? 'text-emerald-600' : 'text-slate-400')}>{whatsappConnected ? 'Conectado' : 'Conectar'}</span></button>
                        <button type="button" onClick={() => user?.enable_scheduling && navigate('/dashboard/appointments')} className={clsx('flex w-full items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 text-left transition-colors', user?.enable_scheduling ? 'hover:bg-slate-100' : 'cursor-default')}><span className="flex min-w-0 items-center gap-3"><Calendar size={17} className="shrink-0 text-primary" /><span className="truncate text-sm font-bold text-slate-700">Próximo compromisso</span></span><span className="max-w-[48%] truncate text-right text-xs font-black text-slate-500">{user?.enable_scheduling ? (snapshot.nextAppointment?.member?.name || 'Agenda livre') : 'Agenda desativada'}</span></button>
                    </div>
                </div>
            </div>

            <div className="rounded-[2.5rem] bg-[#1e293b] p-6 text-white shadow-2xl sm:p-8 lg:p-10">
                <div className="mb-8 flex items-center gap-3"><Zap className="fill-primary text-primary" size={25} /><div><h3 className="text-2xl font-black tracking-tight">Próximos passos</h3><p className="mt-1 text-xs font-medium text-slate-400">Estruture sua operação para ganhar tempo todos os dias.</p></div></div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[
                        { step: '1', title: 'WhatsApp', desc: 'Ative seu bot para automatizar a recepção.', path: '/dashboard/whatsapp' },
                        { step: '2', title: 'Planos', desc: 'Cadastre mensalidades para organizar cobranças.', path: '/dashboard/plans' },
                        { step: '3', title: 'Membros', desc: 'Adicione alunos e mantenha os acessos em dia.', path: '/dashboard/members' }
                    ].map(item => (
                        <button type="button" key={item.step} onClick={() => navigate(item.path)} className="group/item flex min-w-0 items-center gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition-all hover:border-primary/40 hover:bg-white/10 sm:gap-5 sm:p-5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 font-black text-xl text-slate-500 transition-colors group-hover/item:border-primary group-hover/item:text-white">{item.step}</div>
                            <div className="min-w-0 flex-1"><div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">{item.title}</div><p className="text-xs font-medium leading-relaxed text-slate-400">{item.desc}</p></div>
                            <ArrowUpRight size={16} className="shrink-0 text-slate-600 transition-colors group-hover/item:text-primary" />
                        </button>
                    ))}
                </div>
                <div className="mt-6 flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Atualizado às {formatRefreshTime(lastUpdated)}</div>
            </div>
        </div>
    );
};
