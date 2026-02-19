import { useEffect, useState, useCallback } from 'react';
import { useTutorial } from '../contexts/TutorialContext';
import api from '../api';
import { Clock, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

interface Log {
    id: string;
    member?: {
        name: string;
    };
    status: string;
    reason?: string;
    scanned_at: string;
}

export const AccessLogs = () => {
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { startTutorial, hasSeenTutorial } = useTutorial();

    const fetchLogs = useCallback(async () => {
        try {
            const res = await api.get('/logs');
            setLogs(Array.isArray(res.data) ? res.data : []);
            setError(null);
        } catch (err) {
            console.error('Error fetching logs:', err);
            setError('Erro ao carregar acessos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        requestAnimationFrame(() => {
            if (!hasSeenTutorial('access_logs')) {
                startTutorial('access_logs');
            }
            fetchLogs();
        });
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, [fetchLogs, hasSeenTutorial, startTutorial]);

    return (
        <div className="animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">Fluxo de Acessos</h1>
                    <p className="text-slate-500 font-medium">Monitoramento em tempo real dos alunos na recepção.</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-[2rem] border border-slate-100 shadow-sm w-fit group">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#22c55e]"></span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#22c55e]">Sincronizado Live</span>
                </div>
            </div>


            <div id="access-logs-list" className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden mb-20 md:mb-0">
                <div className="hidden md:grid grid-cols-4 bg-white p-12 py-8 border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    <span>Horário</span>
                    <span>Membro da Academia</span>
                    <span>Status</span>
                    <span>Motivo do Acesso</span>
                </div>

                <div className="divide-y divide-slate-50">
                    {loading && logs.length === 0 ? (
                        <div className="p-20 text-center animate-pulse">
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Carregando acessos...</p>
                        </div>
                    ) : error ? (
                        <div className="p-20 text-center">
                            <p className="text-red-400 font-bold uppercase text-xs tracking-widest">{error}</p>
                        </div>
                    ) : logs.map(log => (
                        <div key={log.id} className="grid grid-cols-1 md:grid-cols-4 items-center px-12 py-6 hover:bg-slate-50/30 transition-colors group relative overflow-hidden">
                            {/* Time Section */}
                            <div className="flex items-center gap-4 mb-2 md:mb-0">
                                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-[#22c55e] shadow-xl group-hover:scale-110 transition-transform">
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <div className="text-base font-black text-slate-900 leading-none mb-1">
                                        {new Date(log.scanned_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                        {new Date(log.scanned_at).toLocaleDateString('pt-BR')}
                                    </div>
                                </div>
                            </div>

                            {/* Member Section */}
                            <div className="flex items-center gap-3 mb-4 md:mb-0">
                                <div className={clsx("font-black text-base truncate", log.member ? 'text-slate-900 tracking-tight' : 'text-slate-400 italic font-bold')}>
                                    {log.member?.name || 'Vendedor Desconhecido'}
                                </div>
                            </div>

                            {/* Status Section */}
                            <div className="mb-3 md:mb-0 flex items-center">
                                <span className={clsx(
                                    "flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black tracking-widest uppercase border",
                                    log.status === 'GRANTED' ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                )}>
                                    {log.status === 'GRANTED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                    {log.status === 'GRANTED' ? 'Liberado' : 'Negado'}
                                </span>
                            </div>

                            {/* Reason Section */}
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 group/reason cursor-pointer">
                                <ArrowRight size={14} className="text-slate-300 transform group-hover/reason:translate-x-2 transition-transform" />
                                <span className="truncate">{log.reason || 'Consulta Manual'}</span>
                            </div>
                        </div>
                    ))}

                    {!loading && !error && logs.length === 0 && (
                        <div className="p-20 text-center flex flex-col items-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Clock size={24} className="text-slate-200" />
                            </div>
                            <p className="text-slate-400 font-bold tracking-tight uppercase text-xs">Aguardando primeiros acessos...</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};
