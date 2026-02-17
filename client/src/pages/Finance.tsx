import { useState, useEffect } from 'react';
import { useTutorial } from '../contexts/TutorialContext';
import { TrendingUp, AlertCircle, Clock, CheckCircle, Search } from 'lucide-react';
import api from '../api';
import clsx from 'clsx';

export const Finance = () => {
    const [stats, setStats] = useState({ monthly_income: 0, pending_amount: 0, overdue_amount: 0 });
    const [invoices, setInvoices] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
        if (!hasSeenTutorial('finance')) {
            startTutorial('finance');
        }
    }, []);

    const { startTutorial, hasSeenTutorial } = useTutorial();

    const fetchData = async () => {
        try {
            const [statsRes, invoicesRes] = await Promise.all([
                api.get('/finance/stats'),
                api.get('/finance/invoices')
            ]);
            setStats(statsRes.data);
            setInvoices(invoicesRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkAsPaid = async (id: string) => {
        if (!confirm('Confirmar recebimento deste pagamento?')) return;
        try {
            await api.post(`/finance/invoices/${id}/pay`, { method: 'CASH' });
            fetchData();
        } catch (err) {
            alert('Erro ao processar pagamento');
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.member.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade-in-up">
            <div className="mb-10">
                <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">Gestão Financeira</h1>
                <p className="text-slate-500 font-medium text-lg">Acompanhe a saúde financeira da sua academia em tempo real.</p>
            </div>

            {/* Stats Grid */}
            <div id="finance-stats" className="grid md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6">
                    <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                        <TrendingUp size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Renda Mensal</p>
                        <p className="text-3xl font-black text-slate-900">R$ {stats.monthly_income.toLocaleString('pt-BR')}</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                        <Clock size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pendente</p>
                        <p className="text-3xl font-black text-slate-900">R$ {stats.pending_amount.toLocaleString('pt-BR')}</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                        <AlertCircle size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Atrasado</p>
                        <p className="text-3xl font-black text-slate-900">R$ {stats.overdue_amount.toLocaleString('pt-BR')}</p>
                    </div>
                </div>
            </div>

            {/* Invoices List */}
            <div id="invoices-list" className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex flex-col md:row items-center justify-between gap-4">
                    <h3 className="text-xl font-black text-slate-900">Últimas Transações</h3>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar aluno..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all font-medium text-slate-700"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Aluno</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                                <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="font-black text-slate-900">{inv.member.name}</div>
                                        <div className="text-xs text-slate-400 font-bold">{inv.description}</div>
                                    </td>
                                    <td className="px-8 py-6 font-black text-slate-900">
                                        R$ {inv.amount.toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-8 py-6 text-sm font-bold text-slate-600">
                                        {new Date(inv.due_date).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={clsx(
                                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                            inv.status === 'PAID' ? "bg-green-500/10 text-green-600 border-green-500/20" :
                                                new Date(inv.due_date) < new Date() ? "bg-red-500/10 text-red-600 border-red-500/20" :
                                                    "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                        )}>
                                            {inv.status === 'PAID' ? 'Pago' : (new Date(inv.due_date) < new Date() ? 'Atrasado' : 'Pendente')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        {inv.status !== 'PAID' && (
                                            <button
                                                onClick={() => handleMarkAsPaid(inv.id)}
                                                className="p-3 bg-white border border-slate-100 rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-sm flex items-center gap-2 mx-auto font-black text-[10px] uppercase"
                                            >
                                                <CheckCircle size={16} />
                                                Confirmar Pago
                                            </button>
                                        )}
                                        {inv.status === 'PAID' && (
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Liquidado em {new Date(inv.paid_at).toLocaleDateString()}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
