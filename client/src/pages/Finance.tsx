import { useState, useEffect, useCallback } from 'react';
import { useTutorial } from '../contexts/TutorialContext';
import { TrendingUp, AlertCircle, Clock, CheckCircle, Search } from 'lucide-react';
import api from '../api';
import clsx from 'clsx';

interface Invoice {
    id: string;
    member: {
        name: string;
    };
    description: string;
    amount: number;
    due_date: string;
    status: string;
    paid_at?: string;
}

export const Finance = () => {
    const [stats, setStats] = useState({ monthly_income: 0, pending_amount: 0, overdue_amount: 0 });
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const { startTutorial, hasSeenTutorial } = useTutorial();

    const fetchData = useCallback(async () => {
        try {
            const [statsRes, invoicesRes] = await Promise.all([
                api.get('/finance/stats'),
                api.get('/finance/invoices')
            ]);
            setStats(statsRes.data);
            setInvoices(invoicesRes.data);
        } catch (err) {
            console.error('Error fetching finance data:', err);
        }
    }, []);

    useEffect(() => {
        requestAnimationFrame(() => {
            fetchData();
            if (!hasSeenTutorial('finance')) {
                startTutorial('finance');
            }
        });
    }, [fetchData, hasSeenTutorial, startTutorial]);

    const handleMarkAsPaid = async (id: string) => {
        if (!confirm('Confirmar recebimento deste pagamento?')) return;
        try {
            await api.post(`/finance/invoices/${id}/pay`, { method: 'CASH' });
            fetchData();
        } catch (err) {
            console.error('Error marking invoice as paid:', err);
            alert('Erro ao processar pagamento');
        }
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.member.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade-in-up">
            <div className="mb-12">
                <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">Gestão Financeira</h1>
                <p className="text-slate-500 font-medium">Acompanhe a saúde financeira da sua academia em tempo real.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-8 group hover:shadow-xl transition-all duration-500">
                    <div className="w-16 h-16 bg-[#22c55e]/10 rounded-[1.5rem] flex items-center justify-center text-[#22c55e] group-hover:scale-110 transition-transform">
                        <TrendingUp size={32} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">RENDA MENSAL</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">R$ {stats.monthly_income.toLocaleString('pt-BR')}</h3>
                    </div>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-8 group hover:shadow-xl transition-all duration-500">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-[1.5rem] flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                        <Clock size={32} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">PENDENTE</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">R$ {stats.pending_amount.toLocaleString('pt-BR')}</h3>
                    </div>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-8 group hover:shadow-xl transition-all duration-500">
                    <div className="w-16 h-16 bg-red-500/10 rounded-[1.5rem] flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                        <AlertCircle size={32} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">ATRASADO</p>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">R$ {stats.overdue_amount.toLocaleString('pt-BR')}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-12 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest text-xs">Últimas Transações</h2>
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar aluno..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-16 pr-6 py-4 bg-slate-50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-[#22c55e] transition-all font-medium text-slate-600"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-slate-50">
                                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aluno</th>
                                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Valor</th>
                                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Vencimento</th>
                                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                                <th className="px-12 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-12 py-6">
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
                                        {inv.status === 'PAID' && inv.paid_at && (
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter text-center block">Liquidado em {new Date(inv.paid_at).toLocaleDateString()}</span>
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
