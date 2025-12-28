
import React, { useEffect, useState } from 'react';
import api from '../api';
import { Plus, Search, Pencil, Trash2, Calendar } from 'lucide-react';

export const Members = () => {
    const [members, setMembers] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', plan_id: '', diet: '', workout: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const fetchData = () => {
        api.get('/members').then(res => setMembers(res.data)).catch(console.error);
        api.get('/plans').then(res => setPlans(res.data)).catch(console.error);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/members/${editingId}`, formData);
            } else {
                await api.post('/members', formData);
            }
            setShowModal(false);
            setEditingId(null);
            setFormData({ name: '', phone: '', plan_id: '', diet: '', workout: '' });
            fetchData();
        } catch (e: any) {
            console.error(e);
            alert('Erro ao salvar membro: ' + (e.response?.data?.error || e.message));
        }
    };

    const handleEdit = (member: any) => {
        setEditingId(member.id);
        setFormData({
            name: member.name,
            phone: member.phone,
            plan_id: member.plan_id || '',
            diet: member.diet_plan || '',
            workout: member.workout_routine || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Tem certeza que deseja remover ${name}?`)) return;
        try {
            await api.delete(`/members/${id}`);
            fetchData();
        } catch (e) {
            console.error(e);
            alert('Erro ao remover membro');
        }
    };

    const openForCreate = () => {
        setEditingId(null);
        setFormData({ name: '', phone: '', plan_id: '', diet: '', workout: '' });
        setShowModal(true);
    };

    const insertTemplate = (field: 'diet' | 'workout') => {
        const weeklyTemplate = `
Segunda: 
Terça: 
Quarta: 
Quinta: 
Sexta: 
Sábado: 
Domingo: `;
        setFormData(prev => ({ ...prev, [field]: (prev[field] || '') + weeklyTemplate }));
    };

    const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search));

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Membros</h2>
                <button onClick={openForCreate} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition shadow-sm font-medium">
                    <Plus size={18} />
                    Novo Membro
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex gap-2">
                    <Search className="text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou telefone..."
                        className="outline-none w-full text-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="p-4">Nome</th>
                                <th className="p-4">WhatsApp</th>
                                <th className="p-4">Plano Atual</th>
                                <th className="p-4">Vencimento</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(member => (
                                <tr key={member.id} className="hover:bg-slate-50 transition">
                                    <td className="p-4 font-medium text-slate-800">{member.name}</td>
                                    <td className="p-4 text-slate-600">{member.phone}</td>
                                    <td className="p-4 text-slate-600">
                                        {member.plan?.name || 'Personalizado (30d)'}
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {member.plan_end_date ? new Date(member.plan_end_date).toLocaleDateString('pt-BR') : '-'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${member.active && new Date(member.plan_end_date) > new Date() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {member.active && new Date(member.plan_end_date) > new Date() ? 'Ativo' : 'Inativo/Vencido'}
                                        </span>
                                    </td>
                                    <td className="p-4 flex gap-2 justify-end">
                                        <button onClick={() => handleEdit(member)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Editar">
                                            <Pencil size={18} />
                                        </button>
                                        <button onClick={() => handleDelete(member.id, member.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhum membro encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg animate-fade-in-up max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4 text-slate-800">{editingId ? 'Editar Membro' : 'Adicionar Membro'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                                <input required className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp (com DDD)</label>
                                <input required type="tel" className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" placeholder="5511999999999" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selecione o Plano</label>
                                <select className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" value={formData.plan_id} onChange={e => setFormData({ ...formData, plan_id: e.target.value })}>
                                    <option value="">Selecione...</option>
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} - R$ {p.price} ({p.duration_days} dias)</option>
                                    ))}
                                    <option value="">Sem plano (Padrão 30 dias)</option>
                                </select>
                            </div>

                            {/* Workout Section */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Treino via WhatsApp</label>
                                    <button type="button" onClick={() => insertTemplate('workout')} className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
                                        <Calendar size={12} /> Modelo Semanal
                                    </button>
                                </div>
                                <textarea
                                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
                                    rows={5}
                                    placeholder="Ex: Peito e Tríceps..."
                                    value={formData.workout}
                                    onChange={e => setFormData({ ...formData, workout: e.target.value })}
                                ></textarea>
                            </div>

                            {/* Diet Section */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Dieta via WhatsApp</label>
                                    <button type="button" onClick={() => insertTemplate('diet')} className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
                                        <Calendar size={12} /> Modelo Semanal
                                    </button>
                                </div>
                                <textarea
                                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary outline-none font-mono"
                                    rows={5}
                                    placeholder="Ex: Café da manhã: Pão com ovo..."
                                    value={formData.diet}
                                    onChange={e => setFormData({ ...formData, diet: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">Cancelar</button>
                                <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 shadow-lg hover:shadow-xl transition">
                                    {editingId ? 'Salvar Alterações' : 'Adicionar Membro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
