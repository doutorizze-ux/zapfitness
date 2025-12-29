import React, { useEffect, useState } from 'react';
import api from '../api';
import { Plus, Search, Pencil, Trash2, Calendar, User, Activity, Utensils } from 'lucide-react';

export const Members = () => {
    const [members, setMembers] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', plan_id: '', diet: '', workout: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'info' | 'workout' | 'diet'>('info');

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
            const payload = {
                ...formData,
                plan_id: formData.plan_id || null // Ensure null is sent
            };

            if (editingId) {
                await api.put(`/members/${editingId}`, payload);
            } else {
                await api.post('/members', payload);
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
        setActiveTab('info');
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
        setActiveTab('info');
        setShowModal(true);
    };

    const insertTemplate = (field: 'diet' | 'workout') => {
        const weeklyTemplate = `
Segunda:
- 

Terça:
- 

Quarta:
- 

Quinta:
- 

Sexta:
- 

Sábado:
- 

Domingo:
- `;
        setFormData(prev => ({ ...prev, [field]: (prev[field] || '') + weeklyTemplate }));
    };

    const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search));

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-2xl font-bold text-slate-800">Membros</h2>
                <button onClick={openForCreate} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition shadow-sm font-medium">
                    <Plus size={18} />
                    Novo Membro
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex gap-2 shrink-0">
                    <Search className="text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou telefone..."
                        className="outline-none w-full text-sm"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
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
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col animate-fade-in-up overflow-hidden">

                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-bold text-slate-800">{editingId ? `Editar: ${formData.name}` : 'Novo Membro'}</h3>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => handleSubmit({ preventDefault: () => { } } as any)} className="bg-primary text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition">
                                    Salvar
                                </button>
                                <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
                                    Fechar
                                </button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-100 shrink-0 bg-slate-50">
                            <button
                                onClick={() => setActiveTab('info')}
                                className={`flex-1 p-4 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'info' ? 'bg-white border-t-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <User size={18} /> Dados Básicos
                            </button>
                            <button
                                onClick={() => setActiveTab('workout')}
                                className={`flex-1 p-4 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'workout' ? 'bg-white border-t-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Activity size={18} /> Treino
                            </button>
                            <button
                                onClick={() => setActiveTab('diet')}
                                className={`flex-1 p-4 text-sm font-bold flex items-center justify-center gap-2 transition ${activeTab === 'diet' ? 'bg-white border-t-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Utensils size={18} /> Dieta
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            {activeTab === 'info' && (
                                <div className="space-y-4 max-w-md mx-auto">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                                        <input required className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">WhatsApp (com DDD)</label>
                                        <input required type="tel" className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none" placeholder="5511999999999" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plano</label>
                                        <select className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-primary outline-none" value={formData.plan_id} onChange={e => setFormData({ ...formData, plan_id: e.target.value })}>
                                            <option value="">Selecione...</option>
                                            {plans.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} - R$ {p.price} ({p.duration_days} dias)</option>
                                            ))}
                                            <option value="">Sem plano (Padrão 30 dias)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'workout' && (
                                <div className="h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-slate-500">Descreva a rotina de treinos que será enviada pelo bot.</span>
                                        <button type="button" onClick={() => insertTemplate('workout')} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded flex items-center gap-1 transition">
                                            <Calendar size={14} /> Inserir Modelo Semanal
                                        </button>
                                    </div>
                                    <textarea
                                        className="flex-1 w-full border border-slate-300 rounded-xl p-4 text-base focus:ring-2 focus:ring-primary outline-none font-mono resize-none shadow-sm"
                                        placeholder="Ex: Segunda: Peito..."
                                        value={formData.workout}
                                        onChange={e => setFormData({ ...formData, workout: e.target.value })}
                                        autoFocus
                                    ></textarea>
                                </div>
                            )}

                            {activeTab === 'diet' && (
                                <div className="h-full flex flex-col">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-slate-500">Descreva o plano alimentar.</span>
                                        <button type="button" onClick={() => insertTemplate('diet')} className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded flex items-center gap-1 transition">
                                            <Calendar size={14} /> Inserir Modelo Semanal
                                        </button>
                                    </div>
                                    <textarea
                                        className="flex-1 w-full border border-slate-300 rounded-xl p-4 text-base focus:ring-2 focus:ring-primary outline-none font-mono resize-none shadow-sm"
                                        placeholder="Ex: Café da Manhã: ..."
                                        value={formData.diet}
                                        onChange={e => setFormData({ ...formData, diet: e.target.value })}
                                        autoFocus
                                    ></textarea>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
