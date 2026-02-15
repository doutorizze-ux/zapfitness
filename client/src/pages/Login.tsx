import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { formatImageUrl } from '../utils/format';

import { useSearchParams } from 'react-router-dom';

export const Login = ({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) => {
    const [searchParams] = useSearchParams();
    const planId = searchParams.get('plan');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [isRegistering, setIsRegistering] = useState(initialMode === 'register');
    const [gymName, setGymName] = useState('');
    const [systemSettings, setSystemSettings] = useState({ site_name: 'ZapFitness', logo_url: '' });

    useEffect(() => {
        setIsRegistering(initialMode === 'register');
        api.get('/system/settings').then(res => setSystemSettings(res.data)).catch(console.error);
    }, [initialMode]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/login', { email, password });
            login(res.data.token, res.data.admin);
            if (isRegistering) {
                // If they just registered (rare case here since handleRegister logic changed), just go to dashboard
                navigate('/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError('Credenciais inválidas');
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/register', { gymName, email, password, saasPlanId: planId });
            // Don't auto-login if account is blocked/pending
            setSuccessMsg('Solicitação enviada! Aguarde a aprovação da nossa equipe para acessar.');
            setIsRegistering(false); // Switch to login view (or stay here showing success)
        } catch (err: any) {
            setError(err.response?.data?.details || 'Erro ao registrar.');
        }
    };

    if (successMsg) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
                <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md animate-fade-in-up text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Zap className="text-green-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Sucesso!</h2>
                    <p className="text-slate-600 mb-8">{successMsg}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition shadow-lg"
                    >
                        Voltar ao Início
                    </button>
                    <button
                        onClick={() => { setSuccessMsg(''); setIsRegistering(false); }}
                        className="mt-4 text-sm text-slate-500 font-bold hover:underline"
                    >
                        Tentar Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md animate-fade-in-up">
                <div className="flex justify-center mb-6">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                            {systemSettings.logo_url ? (
                                <img src={formatImageUrl(systemSettings.logo_url)} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center shadow-orange-500/30">
                                    <Zap className="text-white fill-white" size={24} />
                                </div>
                            )}
                        </div>
                        <span className="text-3xl font-black tracking-tight text-slate-900">
                            {systemSettings.site_name === 'ZapFitness' ? (
                                <>Zapp<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Fitness</span></>
                            ) : (
                                systemSettings.site_name
                            )}
                        </span>
                    </div>
                </div>
                <p className="text-slate-500 text-center mb-8">Gerencie sua academia pelo WhatsApp</p>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-center border border-red-200">{error}</div>}

                {!isRegistering ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                            Entrar
                        </button>
                        <div className="text-center mt-6 flex flex-col gap-3">
                            <button type="button" onClick={() => setIsRegistering(true)} className="text-sm text-primary font-bold hover:underline">Não tem conta? Registrar Academia</button>
                            <button type="button" onClick={() => navigate('/')} className="text-sm text-slate-400 hover:text-slate-600 font-bold transition-colors">Voltar para o Início</button>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-4 border border-blue-100">
                            <p className="font-bold mb-1">Criação de Conta</p>
                            <p>Sua conta passará por aprovação da nossa equipe antes de ser liberada.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Nome da Academia</label>
                            <input
                                type="text"
                                value={gymName}
                                onChange={e => setGymName(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="mt-1 block w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                            Solicitar Acesso
                        </button>
                        <div className="text-center mt-6 flex flex-col gap-3">
                            <button type="button" onClick={() => setIsRegistering(false)} className="text-sm text-primary font-bold hover:underline">Já tem conta? Entrar</button>
                            <button type="button" onClick={() => navigate('/')} className="text-sm text-slate-400 hover:text-slate-600 font-bold transition-colors">Voltar para o Início</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
