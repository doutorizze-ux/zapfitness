import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import {
    Building2,
    Lock,
    Clock,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    Save,
    Image as ImageIcon,
    RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

export const ProfileSettings = () => {
    const { user, login } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'access' | 'notifications'>('profile');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [profileData, setProfileData] = useState({ name: '', logo_url: '' });
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [accessData, setAccessData] = useState({ opening_time: '', closing_time: '', access_cooldown: 5, max_daily_access: 1 });
    const [notificationData, setNotificationData] = useState({ checkin_success: '', plan_warning: '', plan_expired: '' });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/me');
            const tenant = res.data;
            setProfileData({ name: tenant.name, logo_url: tenant.logo_url || '' });
            setAccessData({
                opening_time: tenant.opening_time || '06:00',
                closing_time: tenant.closing_time || '23:00',
                access_cooldown: tenant.access_cooldown,
                max_daily_access: tenant.max_daily_access
            });
            if (tenant.notificationSettings) {
                setNotificationData({
                    checkin_success: tenant.notificationSettings.checkin_success,
                    plan_warning: tenant.notificationSettings.plan_warning,
                    plan_expired: tenant.notificationSettings.plan_expired,
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await api.put('/settings/profile', profileData);
            setSuccess('Perfil atualizado com sucesso!');
            // Update auth context
            if (user) {
                const updatedUser = { ...user, name: res.data.name, logo_url: res.data.logo_url };
                login(localStorage.getItem('token') || '', updatedUser);
            }
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return setError('As senhas não coincidem');
        }
        setLoading(true);
        setError(null);
        try {
            await api.put('/settings/security', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setSuccess('Senha alterada com sucesso!');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar senha');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.put('/settings/access', accessData);
            setSuccess('Configurações de acesso atualizadas!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar configurações');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateNotifications = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.put('/settings/notifications', notificationData);
            setSuccess('Mensagens do bot atualizadas!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar mensagens');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Perfil', icon: Building2 },
        { id: 'security', label: 'Segurança', icon: Lock },
        { id: 'access', label: 'Operacional', icon: Clock },
        { id: 'notifications', label: 'Mensagens Bot', icon: MessageSquare },
    ];

    return (
        <div className="animate-fade-in-up pb-24 md:pb-0">
            <div className="mb-10">
                <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Configurações</h1>
                <p className="text-slate-500 font-medium text-lg">Gerencie os detalhes da sua academia e preferências do sistema.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Tabs Sidebar */}
                <div className="lg:w-64 flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                setError(null);
                                setSuccess(null);
                            }}
                            className={clsx(
                                "flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                    : "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-slate-100 shadow-sm"
                            )}
                        >
                            <tab.icon size={20} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-slate-100 relative overflow-hidden">
                        {/* Status Messages */}
                        {success && (
                            <div className="mb-8 flex items-center gap-3 p-4 bg-green-50 text-green-700 rounded-2xl animate-fade-in border border-green-100 font-bold text-sm">
                                <CheckCircle2 size={20} />
                                {success}
                            </div>
                        )}
                        {error && (
                            <div className="mb-8 flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl animate-fade-in border border-red-100 font-bold text-sm">
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}

                        {activeTab === 'profile' && (
                            <form onSubmit={handleUpdateProfile} className="space-y-8 animate-fade-in">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Nome da Academia</label>
                                            <input
                                                type="text"
                                                value={profileData.name}
                                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all"
                                                placeholder="Ex: Matrix Fitness"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">URL da Logo (PNG/JPG)</label>
                                            <div className="relative">
                                                <input
                                                    type="url"
                                                    value={profileData.logo_url}
                                                    onChange={(e) => setProfileData({ ...profileData, logo_url: e.target.value })}
                                                    className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all pl-12"
                                                    placeholder="https://sua-logo.com/logo.png"
                                                />
                                                <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                            </div>
                                            <p className="mt-2 text-[10px] text-slate-400 font-bold">A logo aparecerá no seu painel e comunicações.</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center bg-slate-50 rounded-[2rem] p-8 border-2 border-dashed border-slate-200">
                                        <div className="w-24 h-24 rounded-3xl bg-white shadow-inner flex items-center justify-center mb-4 overflow-hidden outline outline-4 outline-white">
                                            {profileData.logo_url ? (
                                                <img src={profileData.logo_url} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 size={40} className="text-slate-200" />
                                            )}
                                        </div>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-tighter text-center">Prévia da Logo</p>
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button
                                        disabled={loading}
                                        type="submit"
                                        className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black hover:bg-orange-600 shadow-xl shadow-orange-500/20 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        {loading ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                                        SALVAR ALTERAÇÕES
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'security' && (
                            <form onSubmit={handleUpdatePassword} className="space-y-8 animate-fade-in max-w-lg">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Senha Atual</label>
                                        <input
                                            type="password"
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Nova Senha</label>
                                            <input
                                                type="password"
                                                value={passwordData.newPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all"
                                                required
                                                minLength={6}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Confirmar Nova Senha</label>
                                            <input
                                                type="password"
                                                value={passwordData.confirmPassword}
                                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button
                                        disabled={loading}
                                        type="submit"
                                        className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black hover:bg-black shadow-xl shadow-slate-900/20 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        {loading ? <RefreshCw className="animate-spin" size={20} /> : <Lock size={20} />}
                                        ATUALIZAR SENHA
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'access' && (
                            <form onSubmit={handleUpdateAccess} className="space-y-8 animate-fade-in">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                                                <Clock size={16} className="text-orange-500" />
                                                Horário de Funcionamento
                                            </h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Abertura</label>
                                                    <input
                                                        type="time"
                                                        value={accessData.opening_time}
                                                        onChange={(e) => setAccessData({ ...accessData, opening_time: e.target.value })}
                                                        className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fechamento</label>
                                                    <input
                                                        type="time"
                                                        value={accessData.closing_time}
                                                        onChange={(e) => setAccessData({ ...accessData, closing_time: e.target.value })}
                                                        className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                                            <AlertCircle size={16} className="text-orange-500" />
                                            Regras de Catraca
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Intervalo (Minutos)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={accessData.access_cooldown}
                                                    onChange={(e) => setAccessData({ ...accessData, access_cooldown: parseInt(e.target.value) })}
                                                    className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Acessos Diários</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={accessData.max_daily_access}
                                                    onChange={(e) => setAccessData({ ...accessData, max_daily_access: parseInt(e.target.value) })}
                                                    className="w-full bg-slate-50 border-none rounded-xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold">O intervalo evita que o aluno valide o acesso várias vezes seguidas.</p>
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button
                                        disabled={loading}
                                        type="submit"
                                        className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black hover:bg-orange-600 shadow-xl shadow-orange-500/20 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        {loading ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                                        SALVAR OPERACIONAL
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'notifications' && (
                            <form onSubmit={handleUpdateNotifications} className="space-y-8 animate-fade-in">
                                <div className="grid gap-6">
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block flex justify-between items-center">
                                            Check-in Confirmado
                                            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] lowercase">{'{name}'} para o nome</span>
                                        </label>
                                        <textarea
                                            value={notificationData.checkin_success}
                                            onChange={(e) => setNotificationData({ ...notificationData, checkin_success: e.target.value })}
                                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all h-24 resize-none"
                                            required
                                        />
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Alerta Vencimento</label>
                                            <textarea
                                                value={notificationData.plan_warning}
                                                onChange={(e) => setNotificationData({ ...notificationData, plan_warning: e.target.value })}
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all h-32 resize-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Acesso Bloqueado (Expirado)</label>
                                            <textarea
                                                value={notificationData.plan_expired}
                                                onChange={(e) => setNotificationData({ ...notificationData, plan_expired: e.target.value })}
                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all h-32 resize-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button
                                        disabled={loading}
                                        type="submit"
                                        className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black hover:bg-orange-600 shadow-xl shadow-orange-500/20 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        {loading ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                                        SALVAR MENSAGENS
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
