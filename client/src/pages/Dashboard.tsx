import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, Activity, Settings, LogOut, Zap } from 'lucide-react';
import { WhatsAppConnect } from './WhatsAppConnect';
import { Members } from './Members';
import { Plans } from './Plans';
import { AccessLogs } from './AccessLogs';
import clsx from 'clsx';
import api from '../api';

export const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { label: 'Visão Geral', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Planos', path: '/dashboard/plans', icon: Activity },
        { label: 'Membros', path: '/dashboard/members', icon: Users },
        { label: 'Registros de Acesso', path: '/dashboard/logs', icon: Activity },
        { label: 'Conexão WhatsApp', path: '/dashboard/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-slate-100">
            <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-10">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Zap className="text-white fill-white" size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-white">
                            Zapp<span className="text-orange-500">Fitness</span>
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">SaaS Manager</p>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex items-center gap-3 p-3 rounded-lg transition-all duration-200",
                                location.pathname === item.path
                                    ? "bg-primary text-white shadow-lg translate-x-1"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="mb-4 px-2">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Conta</p>
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            {user?.name || 'Admin'}
                        </div>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition">
                        <LogOut size={20} />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto bg-slate-50">
                <div className="p-8 max-w-7xl mx-auto">
                    <Routes>
                        <Route path="/" element={<Welcome />} />
                        <Route path="/plans" element={<Plans />} />
                        <Route path="/members" element={<Members />} />
                        <Route path="/logs" element={<AccessLogs />} />
                        <Route path="/settings" element={<WhatsAppConnect />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

const Welcome = () => {
    const [stats, setStats] = React.useState<any>(null);

    React.useEffect(() => {
        api.get('/me').then(res => setStats(res.data)).catch(console.error);
    }, []);

    return (
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Bem-vindo(a) ao ZapFitness!</h1>
            <p className="text-slate-500 mb-8">Gerencie sua academia com inteligência e automação.</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-500 text-sm font-medium">Membros Ativos</h3>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={20} /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stats?._count?.members || 0}</p>
                    <p className="text-xs text-slate-400 mt-2">Alunos cadastrados</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-500 text-sm font-medium">Check-ins Hoje</h3>
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg"><Activity size={20} /></div>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">{stats?._count?.accessLogs || 0}</p>
                    <p className="text-xs text-slate-400 mt-2">Acessos registrados</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-500 text-sm font-medium">Status do Bot</h3>
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Settings size={20} /></div>
                    </div>
                    <p className="text-xl font-bold text-slate-800 mt-1">{stats?.whatsapp_status === 'CONNECTED' ? 'Online 🟢' : 'Offline 🔴'}</p>
                    <p className="text-xs text-slate-500 mt-2">
                        {stats?.whatsapp_status === 'CONNECTED' ? 'Bot respondendo automaticamente' : 'Conecte o WhatsApp para ativar'}
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-slate-500 text-sm font-medium">Meu Plano</h3>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Activity size={20} /></div>
                    </div>
                    <p className="text-xl font-bold text-slate-800 mt-1">{stats?.saas_plan?.name || 'Gratuito'}</p>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2">
                        <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${Math.min(100, (stats?._count?.members || 0) / (stats?.saas_plan?.max_members || 50) * 100)}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {stats?._count?.members || 0} / {stats?.saas_plan?.max_members || 50} vagas usadas
                    </p>
                </div>
            </div>

            {/* Onboarding Tips */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-lg">
                <h3 className="text-xl font-bold mb-4">🚀 Dicas para começar</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <div className="font-bold text-blue-400">1. Conecte o WhatsApp</div>
                        <p className="text-sm text-slate-300">Vá em "Conexão WhatsApp" e escaneie o QR Code para ativar seu bot de atendimento.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="font-bold text-green-400">2. Cadastre Planos</div>
                        <p className="text-sm text-slate-300">Crie planos mensais ou anuais na aba "Planos" para associar aos seus alunos.</p>
                    </div>
                    <div className="space-y-2">
                        <div className="font-bold text-purple-400">3. Adicione Membros</div>
                        <p className="text-sm text-slate-300">Cadastre seus alunos e gere o QR Code de acesso para eles na aba "Membros".</p>
                    </div>
                </div>
            </div>
        </div>
    )
};
