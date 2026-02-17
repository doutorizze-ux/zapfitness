
import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTutorial } from '../contexts/TutorialContext';
import { LayoutDashboard, Users, Activity, Settings, LogOut, Zap, Bell, Cpu, CreditCard, HelpCircle, MessageCircle, MoreHorizontal } from 'lucide-react';
import { WhatsAppConnect } from './WhatsAppConnect';
import { Turnstiles } from './Turnstiles';
import { Finance } from './Finance';
import { Members } from './Members';
import { Plans } from './Plans';
import { AccessLogs } from './AccessLogs';
import { ProfileSettings } from './ProfileSettings';
import { Leads } from './Leads';
import clsx from 'clsx';
import api from '../api';
import { formatImageUrl } from '../utils/format';

export const Dashboard = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { startTutorial, hasSeenTutorial } = useTutorial();
    const [systemSettings, setSystemSettings] = React.useState({ site_name: 'ZapFitness', logo_url: '' });

    React.useEffect(() => {
        // Start the general dashboard tutorial if not seen
        if (!hasSeenTutorial('dashboard')) {
            startTutorial('dashboard');
        }
        api.get('/system/settings').then(res => setSystemSettings(res.data)).catch(console.error);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Planos', path: '/dashboard/plans', icon: Activity },
        { label: 'Membros', path: '/dashboard/members', icon: Users },
        { label: 'Acessos', path: '/dashboard/logs', icon: Activity },
        { label: 'Financeiro', path: '/dashboard/finance', icon: CreditCard },
        { label: 'Catracas', path: '/dashboard/turnstiles', icon: Cpu },
        { label: 'WhatsApp', path: '/dashboard/whatsapp', icon: Zap },
        { label: 'Leads', path: '/dashboard/leads', icon: MessageCircle },
        { label: 'Configurações', path: '/dashboard/settings', icon: Settings },
    ];

    const currentItem = navItems.find(item => item.path === location.pathname) || navItems[0];

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-72 bg-slate-900 text-white flex-col shadow-2xl z-20">
                <div className="p-8 border-b border-slate-800">
                    <div className="flex items-center gap-3 px-1 mb-10 group cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300 bg-white">
                            {user?.logo_url ? (
                                <img src={formatImageUrl(user.logo_url)} alt="Gym Logo" className="w-full h-full object-contain p-1" />
                            ) : systemSettings.logo_url ? (
                                <img src={formatImageUrl(systemSettings.logo_url)} alt="SaaS Logo" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-tr from-primary to-orange-600 flex items-center justify-center shadow-primary/30">
                                    <Zap className="text-white fill-white" size={20} />
                                </div>
                            )}
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-white truncate max-w-[180px]">
                            {user?.name || (systemSettings.site_name === 'ZapFitness' ? (
                                <>Zapp<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-600">Fitness</span></>
                            ) : (
                                systemSettings.site_name
                            ))}
                        </span>
                    </div>
                </div>

                <nav id="sidebar-nav" className="flex-1 p-6 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex items-center gap-3 p-3.5 rounded-xl transition-all duration-300 group",
                                location.pathname === item.path
                                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <item.icon size={20} className={clsx(location.pathname === item.path ? "scale-110" : "group-hover:scale-110 transition-transform")} />
                            <span className="font-bold text-sm tracking-wide">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-6 border-t border-slate-800 bg-slate-950/50">
                    <div className="flex items-center gap-3 mb-6 p-3 rounded-2xl bg-slate-800/50">
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white shadow-inner overflow-hidden">
                            {user?.logo_url ? (
                                <img src={formatImageUrl(user.logo_url)} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                user?.name?.charAt(0) || 'A'
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-white truncate">{user?.name || 'Academia'}</p>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Online</span>
                            </div>
                        </div>
                    </div>
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
                    }} className="flex items-center gap-3 w-full p-4 mb-2 text-slate-400 hover:text-orange-400 hover:bg-orange-400/10 rounded-xl transition-all font-bold text-sm group">
                        <HelpCircle size={20} className="group-hover:scale-110 transition-transform" />
                        <span>Reiniciar Tutorial</span>
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full p-4 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all font-bold text-sm">
                        <LogOut size={20} />
                        <span>Sair da Conta</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">

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
                        <button className="p-2 text-slate-500 hover:text-primary transition-colors relative">
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

                {/* Desktop Top Header (Subtle) */}
                <header className="hidden md:flex bg-white/50 backdrop-blur-sm border-b border-slate-100 px-10 py-4 items-center justify-between z-10">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{currentItem.label}</h2>
                    <div id="header-profile" className="flex items-center gap-4">
                        <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                    </div>
                </header>

                {/* Content Container */}
                <main id="main-content" className="flex-1 overflow-y-auto min-h-0 pb-32 md:pb-8 touch-pan-y">
                    <div className="p-4 md:p-10 max-w-7xl mx-auto">
                        <Routes>
                            <Route path="/" element={<Welcome />} />
                            <Route path="/plans" element={<Plans />} />
                            <Route path="/members" element={<Members />} />
                            <Route path="/logs" element={<AccessLogs />} />
                            <Route path="/finance" element={<Finance />} />
                            <Route path="/turnstiles" element={<Turnstiles />} />
                            <Route path="/whatsapp" element={<WhatsAppConnect />} />
                            <Route path="/leads" element={<Leads />} />
                            <Route path="/settings" element={<ProfileSettings />} />
                        </Routes>
                    </div>
                </main>

                {/* --- PROFESSIONAL MOBILE SMART DOCK --- */}
                <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-50">
                    <nav className="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-2 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-primary/20">
                        {/* Primary Items (Top 4) */}
                        {[
                            { label: 'Início', path: '/dashboard', icon: LayoutDashboard },
                            { label: 'Leads', path: '/dashboard/leads', icon: MessageCircle },
                            { label: 'Whats', path: '/dashboard/whatsapp', icon: Zap },
                            { label: 'Membros', path: '/dashboard/members', icon: Users },
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
                        <div className="absolute bottom-20 left-0 right-0 animate-fade-in-up">
                            <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-6 shadow-2xl grid grid-cols-3 gap-6">
                                {[
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
                                    onClick={handleLogout}
                                    className="flex flex-col items-center gap-2 group"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500/60 group-hover:bg-red-500 group-hover:text-white transition-all border border-red-500/20">
                                        <LogOut size={24} />
                                    </div>
                                    <span className="text-[10px] font-black text-red-500/40 uppercase tracking-widest">Sair</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Overlay Background to close menu */}
                {isMobileMenuOpen && (
                    <div
                        className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};

const Welcome = () => {
    const [stats, setStats] = React.useState<any>(null);

    React.useEffect(() => {
        api.get('/me').then(res => setStats(res.data)).catch(console.error);
    }, []);

    return (
        <div className="animate-fade-in-up">
            <div className="mb-8 p-4 md:p-0">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2 tracking-tight">
                    Olá, <span className="text-orange-600">{stats?.name || 'Academia'}</span>! 👋
                </h1>
                <p className="text-slate-500 font-medium">Aqui está o que está acontecendo hoje.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10 p-2 md:p-0">
                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform"><Users size={24} /></div>
                    </div>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats?._count?.members || 0}</p>
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mt-1 leading-none">Alunos Ativos</p>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-2xl group-hover:scale-110 transition-transform"><Activity size={24} /></div>
                    </div>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">{stats?._count?.accessLogs || 0}</p>
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mt-1 leading-none">Total de Acessos</p>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group col-span-2 md:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-hover:scale-110 transition-transform"><Zap size={24} /></div>
                        <span className={clsx("px-2 py-1 rounded-full text-[10px] font-black tracking-widest uppercase", stats?.whatsapp_status === 'CONNECTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                            {stats?.whatsapp_status === 'CONNECTED' ? 'CONECTADO' : 'OFFLINE'}
                        </span>
                    </div>
                    <p className="text-lg font-black text-slate-900 leading-tight">Bot WhatsApp</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 leading-none">
                        {stats?.whatsapp_status === 'CONNECTED' ? 'Monitorando recepção' : 'Aguardando pareamento'}
                    </p>
                </div>

                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group col-span-2 md:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 transition-transform"><Activity size={24} /></div>
                        <span className="text-[10px] font-black text-slate-400">{stats?._count?.members || 0}/{stats?.saas_plan?.max_members || 50}</span>
                    </div>
                    <p className="text-lg font-black text-slate-900 leading-tight">Plano {stats?.saas_plan?.name || 'Nenhum'}</p>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, (stats?._count?.members || 0) / (stats?.saas_plan?.max_members || 50) * 100)}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Onboarding Tips */}
            <div className="bg-slate-900 rounded-[2rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-black mb-6 tracking-tight flex items-center gap-2">
                        <Zap className="text-orange-500 fill-orange-500" size={24} />
                        Próximos Passos
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { step: '1', title: 'WhatsApp', color: 'text-blue-400', desc: 'Ative seu bot na aba WhatsApp para automatizar a recepção.' },
                            { step: '2', title: 'Planos', color: 'text-green-400', desc: 'Cadastre suas mensalidades para vincular aos alunos.' },
                            { step: '3', title: 'Membros', color: 'text-purple-400', desc: 'Adicione seus alunos e gere o acesso inteligente deles.' }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-4 group/item cursor-pointer">
                                <div className="w-10 h-10 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xl text-slate-400 group-hover/item:border-orange-500 transition-colors">
                                    {item.step}
                                </div>
                                <div>
                                    <div className={clsx("font-black tracking-widest uppercase text-xs mb-1", item.color)}>{item.title}</div>
                                    <p className="text-sm text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
};
