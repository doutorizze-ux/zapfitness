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
                navigate('/payment');
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
            const res = await api.post('/register', { gymName, email, password, saasPlanId: planId });
            // Auto login
            login(res.data.token, res.data.admin);
            navigate('/payment');
        } catch (err: any) {
            setError(err.response?.data?.details || 'Erro ao registrar.');
        }
    };

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
                    <>
                        {!planId ? (
                            <div className="text-center animate-fade-in">
                                <div className="bg-orange-50 border border-orange-100 p-6 rounded-2xl mb-8">
                                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Zap className="text-orange-600" size={24} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 mb-2">Plano Necessário</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">
                                        Para registrar sua academia, você precisa primeiro escolher um plano que melhor atende suas necessidades.
                                    </p>
                                </div>

                                <button
                                    onClick={() => navigate('/#pricing')}
                                    className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition shadow-lg shadow-primary/30 active:scale-95 mb-4"
                                >
                                    Escolher um Plano
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsRegistering(false)}
                                    className="text-sm text-slate-400 hover:text-slate-600 font-bold transition-colors"
                                >
                                    Já tem conta? Entrar
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4">
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
                                    Criar Conta
                                </button>
                                <div className="text-center mt-6 flex flex-col gap-3">
                                    <button type="button" onClick={() => setIsRegistering(false)} className="text-sm text-primary font-bold hover:underline">Já tem conta? Entrar</button>
                                    <button type="button" onClick={() => navigate('/')} className="text-sm text-slate-400 hover:text-slate-600 font-bold transition-colors">Voltar para o Início</button>
                                </div>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
