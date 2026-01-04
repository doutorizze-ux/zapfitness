import { useEffect, useState } from 'react';
import { useTutorial } from '../contexts/TutorialContext';
import api from '../api';
import { Clock, User, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

export const AccessLogs = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { startTutorial, hasSeenTutorial } = useTutorial();

    useEffect(() => {
        if (!hasSeenTutorial('access_logs')) {
            startTutorial('access_logs');
        }
        const fetchLogs = async () => {
            try {
                const res = await api.get('/logs');
                setLogs(Array.isArray(res.data) ? res.data : []);
                setError(null);
            } catch (err: any) {
                console.error('Error fetching logs:', err);
                setError('Erro ao carregar acessos');
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Fluxo de Acessos</h2>
                    <p className="text-slate-500 font-medium">Monitoramento em tempo real da recepção.</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm w-fit">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Update</span>
                </div>
            </div>


            <div id="access-logs-list" className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden mb-20 md:mb-0">
                {/* Mobile & Desktop Header for the List */}
                <div className="hidden md:grid grid-cols-4 bg-slate-50/50 p-6 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Horário</span>
                    <span>Membro</span>
                    <span>Status</span>
                    <span>Motivo</span>
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
                        <div key={log.id} className="grid grid-cols-1 md:grid-cols-4 items-center p-5 md:p-6 hover:bg-slate-50/50 transition-colors group">
                            {/* Time Section */}
                            <div className="flex items-center gap-3 mb-2 md:mb-0">
                                <div className="p-2 bg-slate-100 text-slate-400 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <Clock size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-700">
                                        {new Date(log.scanned_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter md:hidden">
                                        {new Date(log.scanned_at).toLocaleDateString('pt-BR')}
                                    </div>
                                    <div className="hidden md:block text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                        {new Date(log.scanned_at).toLocaleDateString('pt-BR')}
                                    </div>
                                </div>
                            </div>

                            {/* Member Section */}
                            <div className="flex items-center gap-3 mb-4 md:mb-0">
                                <div className="md:hidden p-2 bg-orange-50 text-orange-500 rounded-xl">
                                    <User size={16} />
                                </div>
                                <div className={clsx("font-extrabold text-base md:text-sm truncate", log.member ? 'text-slate-900' : 'text-slate-400 italic font-medium')}>
                                    {log.member?.name || 'Desconhecido'}
                                </div>
                            </div>

                            {/* Status Section */}
                            <div className="mb-3 md:mb-0 flex items-center">
                                <span className={clsx(
                                    "flex items-center gap-2 px-4 py-1.5 md:px-3 md:py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-sm",
                                    log.status === 'GRANTED' ? 'bg-green-100 text-green-700 shadow-green-200/20' : 'bg-red-100 text-red-700 shadow-red-200/20'
                                )}>
                                    {log.status === 'GRANTED' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                    {log.status === 'GRANTED' ? 'LIBERADO' : 'NEGADO'}
                                </span>
                            </div>

                            {/* Reason Section (Desktop) / Info (Mobile) */}
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-2 group/reason cursor-pointer">
                                <ArrowRight size={14} className="md:hidden text-slate-300" />
                                <span className="truncate">{log.reason || 'Consulta via WhatsApp'}</span>
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
