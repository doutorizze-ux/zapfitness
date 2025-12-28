import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { useNavigate } from 'react-router-dom';

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

    useEffect(() => {
        setIsRegistering(initialMode === 'register');
    }, [initialMode]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/login', { email, password });
            login(res.data.token, res.data.admin);
            navigate('/dashboard');
        } catch (err) {
            setError('Credenciais inválidas');
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/register', { gymName, email, password, saasPlanId: planId });
            setIsRegistering(false);
            alert('Academia registrada! Faça login.');
        } catch (err: any) {
            setError(err.response?.data?.details || 'Erro ao registrar.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md animate-fade-in-up">
                <h1 className="text-4xl font-extrabold text-center text-primary mb-2">ZapFitness</h1>
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
                        <div className="text-center mt-6">
                            <span className="text-sm text-gray-600">Não tem conta? </span>
                            <button type="button" onClick={() => setIsRegistering(true)} className="text-sm text-primary font-bold hover:underline">Registrar Academia</button>
                        </div>
                    </form>
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
                        <div className="text-center mt-6">
                            <button type="button" onClick={() => setIsRegistering(false)} className="text-sm text-primary font-bold hover:underline">Voltar para Login</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
