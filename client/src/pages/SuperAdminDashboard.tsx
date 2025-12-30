import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { LogOut, Activity, Users, Store, ShieldAlert, Power, Pencil, Trash2, WifiOff } from 'lucide-react';

export const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [tenants, setTenants] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [newPlan, setNewPlan] = useState({ name: '', price: '', max_members: '', description: '' });

    // Edit Tenant State
    const [editingTenant, setEditingTenant] = useState<any>(null);
    const [showTenantModal, setShowTenantModal] = useState(false);

    const fetchData = () => {
        api.get('/saas/dashboard').then(res => setStats(res.data)).catch(console.error);
        api.get('/saas/tenants').then(res => setTenants(res.data)).catch(console.error);
        api.get('/saas/plans').then(res => setPlans(res.data)).catch(console.error);
    };

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/saas/plans', newPlan);
            setShowPlanModal(false);
            setNewPlan({ name: '', price: '', max_members: '', description: '' });
            fetchData();
        } catch (e: any) {
            console.error('Erro detalhado:', e.response?.data || e.message);
            const errorMsg = e.response?.data?.error || 'Erro ao criar plano';
            alert(errorMsg);
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (!confirm('Tem certeza?')) return;
        try {
            await api.delete(`/saas/plans/${id}`);
            fetchData();
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir plano');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/admin/login');
    };

    const handleToggle = async (id: string) => {
        try {
            await api.post(`/saas/tenants/${id}/toggle`);
            fetchData();
        } catch (e) {
            console.error(e);
            alert('Erro ao alterar status');
        }
    };

    // New Actions
    const handleEditTenant = (tenant: any) => {
        setEditingTenant({
            id: tenant.id,
            name: tenant.name,
            owner_phone: tenant.owner_phone || '',
            is_free: tenant.is_free || false
        });
        setShowTenantModal(true);
    };

    const handleSaveTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/saas/tenants/${editingTenant.id}`, editingTenant);
            setShowTenantModal(false);
            setEditingTenant(null);
            fetchData();
        } catch (e: any) {
            alert('Erro ao salvar: ' + e.message);
        }
    };

    const handleDeleteTenant = async (id: string) => {
        if (!confirm('ATENÇÃO: Isso excluirá permanentemente a academia e todos os seus dados. Continuar?')) return;
        try {
            await api.delete(`/saas/tenants/${id}`);
            fetchData();
        } catch (e) {
            alert('Erro ao excluir');
        }
    };

    const handleDisconnect = async (id: string) => {
        if (!confirm('Desconectar o WhatsApp desta academia?')) return;
        try {
            await api.post(`/saas/tenants/${id}/disconnect`);
            fetchData();
            alert('WhatsApp desconectado com sucesso.');
        } catch (e) {
            alert('Erro ao desconectar');
        }
    };

    return (
        <div className="min-h-screen bg-slate-100">
            <nav className="bg-slate-900 text-white p-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold">Z</div>
                        <div>
                            <h1 className="text-xl font-bold">ZapFitness</h1>
                            <span className="text-xs text-slate-400 uppercase tracking-widest">Super Admin</span>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 hover:text-red-400 transition">
                        <LogOut size={20} />
                        Sair
                    </button>
                </div>
            </nav>

            <main className="p-8 max-w-7xl mx-auto">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-slate-500 font-bold text-sm">Total Academias</h3>
                            <Store className="text-blue-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats?.totalGyms || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-slate-500 font-bold text-sm">Ativas</h3>
                            <Activity className="text-green-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats?.activeGyms || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-slate-500 font-bold text-sm">Bloqueadas</h3>
                            <ShieldAlert className="text-red-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats?.blockedGyms || 0}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-slate-500 font-bold text-sm">Total Membros</h3>
                            <Users className="text-purple-500" size={20} />
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{stats?.totalMembers || 0}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Tenants List */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">Gerenciar Academias</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="p-4">Academia</th>
                                        <th className="p-4">Plano</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tenants.map(tenant => (
                                        <tr key={tenant.id} className="hover:bg-slate-50 transition">
                                            <td className="p-4">
                                                <p className="font-bold text-slate-800">{tenant.name}</p>
                                                <p className="text-xs text-slate-600 font-medium">{tenant.admins?.[0]?.email}</p>
                                                <p className="text-xs text-slate-500">{tenant.slug}</p>
                                                <p className="text-xs text-slate-400">{tenant.owner_phone}</p>
                                                {tenant.is_free && (
                                                    <span className="inline-block mt-1 bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                                        CONTA GRÁTIS
                                                    </span>
                                                )}
                                                <span className={`text-[10px] uppercase font-bold ${tenant.whatsapp_status === 'CONNECTED' ? 'text-green-500' : 'text-slate-400'}`}>
                                                    Warning: WA {tenant.whatsapp_status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-600">{tenant.saas_plan?.name || '-'}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${tenant.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                    {tenant.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-1">
                                                <button onClick={() => handleEditTenant(tenant)} className="p-2 text-blue-500 hover:bg-blue-50 rounded" title="Editar">
                                                    <Pencil size={18} />
                                                </button>
                                                <button onClick={() => handleToggle(tenant.id)} className={`p-2 rounded ${tenant.status === 'ACTIVE' ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`} title={tenant.status === 'ACTIVE' ? 'Bloquear' : 'Ativar'}>
                                                    <Power size={18} />
                                                </button>
                                                <button onClick={() => handleDisconnect(tenant.id)} className="p-2 text-slate-500 hover:bg-slate-100 rounded" title="Desconectar WhatsApp">
                                                    <WifiOff size={18} />
                                                </button>
                                                <button onClick={() => handleDeleteTenant(tenant.id)} className="p-2 text-red-500 hover:bg-red-50 rounded" title="Excluir Permanentemente">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Plans Management */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800">Planos SaaS</h2>
                            <button onClick={() => setShowPlanModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition">
                                + Novo Plano
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        <th className="p-4">Nome</th>
                                        <th className="p-4">Preço</th>
                                        <th className="p-4">Max Membros</th>
                                        <th className="p-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {plans.map(plan => (
                                        <tr key={plan.id} className="hover:bg-slate-50 transition">
                                            <td className="p-4 font-bold text-slate-800">{plan.name}</td>
                                            <td className="p-4 text-slate-600">R$ {parseFloat(plan.price).toFixed(2)}</td>
                                            <td className="p-4 text-slate-600">{plan.max_members}</td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => handleDeletePlan(plan.id)} className="text-red-500 hover:text-red-700 p-2">
                                                    Excluir
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Edit Tenant Modal */}
                {
                    showTenantModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up">
                                <h2 className="text-xl font-bold mb-4">Editar Academia</h2>
                                <form onSubmit={handleSaveTenant} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Nome da Academia</label>
                                        <input required type="text" value={editingTenant?.name} onChange={e => setEditingTenant({ ...editingTenant, name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded p-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Telefone do Dono</label>
                                        <input type="text" value={editingTenant?.owner_phone} onChange={e => setEditingTenant({ ...editingTenant, owner_phone: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded p-2" />
                                    </div>
                                    <div className="flex items-center gap-2 py-2">
                                        <input
                                            type="checkbox"
                                            id="is_free"
                                            checked={editingTenant?.is_free}
                                            onChange={e => setEditingTenant({ ...editingTenant, is_free: e.target.checked })}
                                            className="w-4 h-4 text-primary rounded"
                                        />
                                        <label htmlFor="is_free" className="text-sm font-bold text-slate-700 cursor-pointer">
                                            Liberar Conta Grátis (Trial/Teste)
                                        </label>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-6">
                                        <button type="button" onClick={() => setShowTenantModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                                        <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800">Salvar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Create Plan Modal */}
                {
                    showPlanModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up">
                                <h2 className="text-xl font-bold mb-4">Novo Plano</h2>
                                <form onSubmit={handleCreatePlan} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Nome do Plano</label>
                                        <input required type="text" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded p-2" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Preço (R$)</label>
                                            <input required type="number" step="0.01" value={newPlan.price} onChange={e => setNewPlan({ ...newPlan, price: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded p-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Max Membros</label>
                                            <input required type="number" value={newPlan.max_members} onChange={e => setNewPlan({ ...newPlan, max_members: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded p-2" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Descrição</label>
                                        <textarea value={newPlan.description} onChange={e => setNewPlan({ ...newPlan, description: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded p-2" rows={3}></textarea>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-6">
                                        <button type="button" onClick={() => setShowPlanModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancelar</button>
                                        <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded hover:bg-slate-800">Criar Plano</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }
            </main >
        </div >
    );
};
