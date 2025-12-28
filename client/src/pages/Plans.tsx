import React, { useEffect, useState } from 'react';
import api from '../api';
import { Plus, Trash2, Tag } from 'lucide-react';

export const Plans = () => {
    const [plans, setPlans] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', price: '', duration_days: '' });

    const fetchPlans = () => {
        api.get('/plans').then(res => setPlans(res.data)).catch(console.error);
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/plans', formData);
            setShowModal(false);
            setFormData({ name: '', price: '', duration_days: '' });
            fetchPlans();
        } catch (e) {
            console.error(e);
            alert('Erro ao criar plano');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este plano?')) {
            try {
                await api.delete(`/plans/${id}`);
                fetchPlans();
            } catch (e) {
                console.error(e);
                alert('Erro ao excluir plano');
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Planos de Assinatura</h2>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition shadow-sm font-medium">
                    <Plus size={18} />
                    Novo Plano
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition relative group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Tag size={20} /></div>
                            <button onClick={() => handleDelete(plan.id)} className="text-slate-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                <Trash2 size={18} />
                            </button>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">{plan.name}</h3>
                        <p className="text-3xl font-bold text-primary mb-2">R$ {plan.price.toFixed(2)}</p>
                        <p className="text-sm text-slate-500">Duração: {plan.duration_days} dias</p>
                    </div>
                ))}
                {plans.length === 0 && (
                    <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
                        <p className="text-slate-500">Nenhum plano cadastrado. Crie o primeiro!</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up">
                        <h3 className="text-xl font-bold mb-4 text-slate-800">Novo Plano</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome do Plano</label>
                                <input required className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: Mensal Gold" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço (R$)</label>
                                    <input required type="number" step="0.01" className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" placeholder="99.90" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Duração (Dias)</label>
                                    <input required type="number" className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" placeholder="30" value={formData.duration_days} onChange={e => setFormData({ ...formData, duration_days: e.target.value })} />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">Cancelar</button>
                                <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 shadow-lg hover:shadow-xl transition">Salvar Plano</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
