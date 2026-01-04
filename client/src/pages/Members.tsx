import React, { useEffect, useState } from 'react';
import { useTutorial } from '../contexts/TutorialContext';
import api from '../api';
import { Plus, Search, Pencil, Trash2, Calendar, User, Activity, Utensils, Phone, CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';

export const Members = () => {
    const [members, setMembers] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', plan_id: '', diet: '', workout: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'info' | 'workout' | 'diet'>('info');

    const { startTutorial, hasSeenTutorial } = useTutorial();

    const fetchData = () => {
        api.get('/members').then(res => setMembers(res.data)).catch(console.error);
        api.get('/plans').then(res => setPlans(res.data)).catch(console.error);
    };

    useEffect(() => {
        fetchData();
        if (!hasSeenTutorial('members')) {
            startTutorial('members');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                plan_id: formData.plan_id || null
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
        <>
            <div className="flex flex-col h-full animate-fade-in-up">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Membros</h2>
                        <p className="text-slate-500 font-medium">Gestão de alunos e acessos.</p>
                    </div>
                    <button
                        id="btn-new-member"
                        onClick={openForCreate}
                        className="flex items-center justify-center gap-2 bg-orange-500 text-white px-6 py-4 rounded-2xl md:rounded-xl font-black hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 active:scale-95"
                    >
                        <Plus size={20} />
                        NOVO MEMBRO
                    </button>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden mb-20 md:mb-0">
                    <div id="member-search" className="p-5 md:p-6 border-b border-slate-50 flex items-center gap-3 bg-slate-50/50">
                        <Search className="text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou WhatsApp..."
                            className="bg-transparent outline-none w-full text-base font-medium placeholder:text-slate-400"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Mobile View: Card List */}
                    <div className="md:hidden divide-y divide-slate-50 overflow-auto max-h-[60vh] touch-pan-y">
                        {filtered.map(member => {
                            const isActive = member.active && new Date(member.plan_end_date) > new Date();
                            return (
                                <div key={member.id} className="p-5 active:bg-slate-50 transition-colors flex items-center justify-between group">
                                    <div className="flex-1 min-w-0" onClick={() => handleEdit(member)}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-slate-900 truncate">{member.name}</h4>
                                            {isActive ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-slate-300" />}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                            <span className="flex items-center gap-1"><Phone size={12} /> {member.phone}</span>
                                            <span className="text-slate-200">|</span>
                                            <span>{member.plan?.name || 'Manual'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 ml-4">
                                        <button onClick={() => handleDelete(member.id, member.name)} className="p-3 text-slate-300 hover:text-red-500 transition">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop View: Table */}
                    <div id="members-list" className="hidden md:block overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50/50 text-slate-400 font-bold uppercase tracking-widest text-[10px] border-b border-slate-100">
                                <tr>
                                    <th className="p-6">Nome / WhatsApp</th>
                                    <th className="p-6">Plano / Vencimento</th>
                                    <th className="p-6">Status</th>
                                    <th className="p-6 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(member => {
                                    const isActive = member.active && new Date(member.plan_end_date) > new Date();
                                    return (
                                        <tr key={member.id} className="hover:bg-slate-50/50 transition group">
                                            <td className="p-6">
                                                <div className="font-bold text-slate-800">{member.name}</div>
                                                <div className="text-xs text-slate-400 font-medium">{member.phone}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="font-bold text-slate-600">{member.plan?.name || 'Personalizado'}</div>
                                                <div className="text-xs text-slate-400">Até {member.plan_end_date ? new Date(member.plan_end_date).toLocaleDateString('pt-BR') : '-'}</div>
                                            </td>
                                            <td className="p-6">
                                                <span className={clsx("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                                                    {isActive ? 'ATIVO' : 'VENCIDO'}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(member)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition" title="Editar">
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button onClick={() => handleDelete(member.id, member.name)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal - Outside of animation container to fix fixed positioning */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center p-4 z-[9999] backdrop-blur-md transition-all duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl h-[90vh] md:h-[85vh] flex flex-col animate-fade-in-up overflow-hidden relative border border-white/20">

                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-900">{editingId ? 'Editar Aluno' : 'Novo Aluno'}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{editingId ? formData.name : 'Cadastro Inteligente'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={handleSubmit} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 active:scale-95">
                                    SALVAR
                                </button>
                                <button onClick={() => setShowModal(false)} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition flex items-center justify-center">
                                    <XCircle size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Navigation Tabs (App Like) */}
                        <div className="flex px-4 border-b border-slate-100 shrink-0 bg-slate-50/30">
                            {[
                                { id: 'info', icon: User, label: 'Perfil' },
                                { id: 'workout', icon: Activity, label: 'Treino' },
                                { id: 'diet', icon: Utensils, label: 'Dieta' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={clsx(
                                        "flex-1 py-5 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all relative",
                                        activeTab === tab.id ? 'text-orange-500' : 'text-slate-400 hover:text-slate-600'
                                    )}
                                >
                                    <tab.icon size={18} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full"></span>}
                                </button>
                            ))}
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-8 bg-white touch-pan-y">
                            {activeTab === 'info' && (
                                <div className="space-y-6 pb-10">
                                    <div className="group">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nome Completo</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                                            <input required className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-bold text-slate-800" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">WhatsApp (com DDD)</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                                            <input required type="tel" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-bold text-slate-800" placeholder="5511999999999" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Plano da Academia</label>
                                        <div className="relative">
                                            <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors" size={20} />
                                            <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 pl-12 focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-bold text-slate-800 appearance-none pointer-events-auto" value={formData.plan_id} onChange={e => setFormData({ ...formData, plan_id: e.target.value })}>
                                                <option value="">Selecione um plano...</option>
                                                {plans.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} - R$ {p.price} ({p.duration_days} dias)</option>
                                                ))}
                                                <option value="">Sem plano fixo (30 dias)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'workout' && (
                                <div className="h-full flex flex-col space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <span className="text-sm font-medium text-slate-400">Esta ficha será enviada via WhatsApp para o aluno.</span>
                                        <button type="button" onClick={() => insertTemplate('workout')} className="w-full sm:w-auto text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition">
                                            <Calendar size={14} /> Usar Modelo Semanal
                                        </button>
                                    </div>
                                    <textarea
                                        className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-6 md:p-8 text-base focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-mono resize-none shadow-inner min-h-[300px]"
                                        placeholder="Digite o treino aqui..."
                                        value={formData.workout}
                                        onChange={e => setFormData({ ...formData, workout: e.target.value })}
                                    ></textarea>
                                </div>
                            )}

                            {activeTab === 'diet' && (
                                <div className="h-full flex flex-col space-y-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <span className="text-sm font-medium text-slate-400">O plano alimentar será enviado junto com o treino.</span>
                                        <button type="button" onClick={() => insertTemplate('diet')} className="w-full sm:w-auto text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition">
                                            <Calendar size={14} /> Usar Modelo Semanal
                                        </button>
                                    </div>
                                    <textarea
                                        className="flex-1 w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-6 md:p-8 text-base focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all font-mono resize-none shadow-inner min-h-[300px]"
                                        placeholder="Digite a dieta aqui..."
                                        value={formData.diet}
                                        onChange={e => setFormData({ ...formData, diet: e.target.value })}
                                    ></textarea>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
