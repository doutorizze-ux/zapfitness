import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
// AuthContext not used in this component as per lint error

// Actually, AuthContext expects { id, name, tenant_id }. SaaS owner doesn't have tenant_id.
// It's better to handle SaaS login separately or make AuthContext flexible.
// For simplicity and speed, I'll direct use localStorage and a simple state check in the dashboard or modify AuthContext.

// Let's modify AuthContext slightly to support "role" or optional tenant_id.
// But first, let's create the page.

export const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/saas/login', { email, password });
            const { token, admin } = res.data;
            // Store as standard token to reuse api interceptor
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify({ ...admin, role: 'SAAS_OWNER' }));
            navigate('/admin/dashboard');
        } catch (err) {
            setError('Credenciais inválidas');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-extrabold text-center text-slate-800 mb-2">ZapFitness <span className="text-primary">Admin</span></h1>
                <p className="text-slate-500 text-center mb-8">Acesso Global SaaS</p>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-center border border-red-200">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Email Admin</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-lg p-3"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-lg p-3"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700 transition">
                        Entrar como Super Admin
                    </button>
                </form>
            </div>
        </div>
    );
};
