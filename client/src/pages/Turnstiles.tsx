import { useState, useEffect, useCallback } from 'react';
import { useTutorial } from '../contexts/TutorialContext';
import { Cpu, Wifi, CheckCircle, Download, ExternalLink, ShieldCheck, XCircle, Clock } from 'lucide-react';
import clsx from 'clsx';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

interface GateEvent {
    id: string;
    name: string;
    status: 'GRANTED' | 'DENIED';
    time: string;
    reason?: string;
}

interface Log {
    id: string;
    member?: {
        name: string;
    };
    status: 'GRANTED' | 'DENIED';
    scanned_at: string;
}

interface SocketGateData {
    memberName: string;
    timestamp: string;
    reason?: string;
}

export const Turnstiles = () => {
    const { user } = useAuth();
    const [selectedBrand, setSelectedBrand] = useState('generic');
    const [token, setToken] = useState('Carregando...');
    const [recentEvents, setRecentEvents] = useState<GateEvent[]>([]);

    const { startTutorial, hasSeenTutorial } = useTutorial();

    const fetchConfig = useCallback(async () => {
        try {
            const res = await api.get('/gate/config');
            setToken(res.data.gate_token);
            setSelectedBrand(res.data.turnstile_brand || 'generic');
        } catch (err) {
            console.error('Error fetching config:', err);
        }
    }, []);

    const fetchRecentLogs = useCallback(async () => {
        try {
            const res = await api.get('/logs');
            const formatted = res.data.slice(0, 5).map((log: Log) => ({
                id: log.id,
                name: log.member?.name || 'Desconhecido',
                status: log.status,
                time: new Date(log.scanned_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }));
            setRecentEvents(formatted);
        } catch (err) {
            console.error('Erro ao buscar logs recentes:', err);
        }
    }, []);

    useEffect(() => {
        requestAnimationFrame(() => {
            fetchConfig();
            fetchRecentLogs();
        });

        if (!hasSeenTutorial('turnstiles')) {
            startTutorial('turnstiles');
        }

        if (user?.tenant_id) {
            socket.emit('join_room', { room: user.tenant_id });

            socket.on('gate:open', (data: SocketGateData) => {
                setRecentEvents(prev => [{
                    id: Math.random().toString(),
                    name: data.memberName,
                    status: 'GRANTED' as const,
                    time: new Date(data.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                }, ...prev].slice(0, 5));
            });

            socket.on('gate:denied', (data: SocketGateData) => {
                setRecentEvents(prev => [{
                    id: Math.random().toString(),
                    name: data.memberName || 'Visitante/Inativo',
                    status: 'DENIED' as const,
                    reason: data.reason,
                    time: new Date(data.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                }, ...prev].slice(0, 5));
            });
        }

        return () => {
            socket.off('gate:open');
            socket.off('gate:denied');
        };
    }, [user?.tenant_id, startTutorial, hasSeenTutorial, fetchConfig, fetchRecentLogs]);



    const handleRegenerateToken = async () => {
        if (!confirm('Tem certeza? O ZappBridge atual irá parar de funcionar até ser atualizado com o novo token.')) return;
        try {
            const res = await api.post('/gate/regenerate-token');
            setToken(res.data.gate_token);
        } catch (err) {
            console.error('Error regenerating token:', err);
            alert('Erro ao regenerar token');
        }
    };

    const handleBrandChange = async (brand: string) => {
        setSelectedBrand(brand);
        try {
            await api.put('/gate/brand', { brand });
        } catch (err) {
            console.error('Error saving brand:', err);
        }
    };

    const handleDownload = async () => {
        try {
            const response = await api.get('/gate/download-bridge', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'ZappBridge.js');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Download error:', err);
            alert('Erro ao baixar arquivo. Verifique se o token foi gerado.');
        }
    };

    const handleShowGuide = async () => {
        try {
            const res = await api.get('/gate/guide');
            alert(res.data.guide);
        } catch (err) {
            console.error('Error showing guide:', err);
            alert('Erro ao carregar guia.');
        }
    };

    const brands = [
        { id: 'controlid', name: 'Control iD', logo: '🚀', desc: 'Integração direta via Nuvem (Sem PC ligado)' },
        { id: 'topdata', name: 'Topdata', logo: '⚡', desc: 'Integração via ZappBridge (PC Recepção)' },
        { id: 'henry', name: 'Henry', logo: '💎', desc: 'Integração via ZappBridge (PC Recepção)' },
        { id: 'generic', name: 'Módulo USB/Relé', logo: '🔌', desc: 'Solução de baixo custo para qualquer catraca' },
    ];

    return (
        <div className="animate-fade-in-up">
            <div className="mb-8 md:mb-10">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight">Catracas Inteligentes</h1>
                <p className="text-slate-500 font-medium text-base md:text-lg">Conecte sua academia ao mundo físico com liberação automática.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Brand Selector */}
                <div className="lg:col-span-2 space-y-8">
                    <div id="turnstiles-brands" className="bg-white p-10 md:p-12 rounded-[3rem] shadow-sm border border-slate-100">
                        <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-widest text-xs">
                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                <Cpu className="text-orange-500" size={18} />
                            </div>
                            Selecione sua Marca
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-6">
                            {brands.map((brand) => (
                                <button
                                    key={brand.id}
                                    onClick={() => handleBrandChange(brand.id)}
                                    className={clsx(
                                        "p-8 rounded-[2.5rem] border-2 text-left transition-all duration-500 group relative overflow-hidden",
                                        selectedBrand === brand.id
                                            ? "border-orange-500 bg-white shadow-xl shadow-orange-500/10"
                                            : "border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
                                    )}
                                >
                                    {selectedBrand === brand.id && (
                                        <div className="absolute top-4 right-4 text-orange-500">
                                            <CheckCircle size={20} fill="currentColor" className="text-white" />
                                        </div>
                                    )}
                                    <div className="text-4xl mb-6 group-hover:scale-110 transition-transform duration-500">{brand.logo}</div>
                                    <div className="font-black text-slate-900 text-lg mb-1">{brand.name}</div>
                                    <div className="text-[10px] text-slate-400 font-bold leading-tight uppercase tracking-widest">{brand.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Configuration Panel */}
                    <div id="turnstiles-config" className="bg-[#1e293b] rounded-[3rem] p-10 md:p-12 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-12">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <Wifi className="text-[#22c55e]" size={32} />
                                </div>
                                <span className="bg-[#22c55e]/10 text-[#22c55e] px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#22c55e]/20">
                                    Servidor Pronto
                                </span>
                            </div>

                            <h4 className="text-3xl font-black mb-6 tracking-tight">Como conectar?</h4>
                            <div className="space-y-8">
                                {selectedBrand === 'controlid' ? (
                                    <div className="space-y-6">
                                        <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-lg">As catracas Control iD podem se conectar diretamente ao nosso servidor sem precisar de um computador ligado na recepção.</p>
                                        <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem]">
                                            <div className="text-[10px] font-black text-[#22c55e] uppercase tracking-[0.2em] mb-6">Configuração na Catraca</div>
                                            <div className="space-y-4 font-mono text-sm">
                                                <div className="flex flex-col sm:flex-row justify-between border-b border-white/5 pb-4 gap-2">
                                                    <span className="text-slate-500 uppercase tracking-widest text-[10px] font-black">URL do Servidor</span>
                                                    <span className="text-white font-bold truncate">api.zapp.fitness/gate</span>
                                                </div>
                                                <div className="flex flex-col sm:flex-row justify-between pt-2 gap-2">
                                                    <span className="text-slate-500 uppercase tracking-widest text-[10px] font-black">Seu Token de Acesso</span>
                                                    <div className="flex items-center justify-between sm:justify-end gap-3 overflow-hidden">
                                                        <span className="text-[#22c55e] font-black truncate select-all">{token}</span>
                                                        <button onClick={handleRegenerateToken} className="text-[10px] bg-white/10 px-3 py-1.5 rounded-xl font-black uppercase tracking-widest hover:bg-white/20 transition-all">Novo</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-lg">Marcas como Topdata e Henry precisam do nosso agente local (ZappBridge) instalado no PC da recepção.</p>
                                        <div className="bg-white/5 border border-white/5 p-8 rounded-[2rem] mb-10">
                                            <div className="text-[10px] font-black text-[#22c55e] uppercase tracking-[0.2em] mb-4">Seu Token de Acesso</div>
                                            <div className="flex items-center justify-between gap-6">
                                                <span className="text-xl md:text-2xl font-mono font-black text-[#22c55e] truncate tracking-wider">{token}</span>
                                                <button onClick={handleRegenerateToken} className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition-all flex-shrink-0">Novo Token</button>
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <button
                                                onClick={handleDownload}
                                                className="bg-[#22c55e] text-white px-10 py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-[#16a34a] transition-all shadow-2xl shadow-[#22c55e]/20 text-sm md:text-base uppercase tracking-widest"
                                            >
                                                <Download size={20} />
                                                Baixar ZappBridge (.js)
                                            </button>
                                            <button
                                                onClick={handleShowGuide}
                                                className="bg-white/5 border border-white/5 text-white px-10 py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-white/10 transition-all text-sm md:text-base uppercase tracking-widest"
                                            >
                                                <ExternalLink size={20} />
                                                Guia de Instalação
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
                    </div>
                </div>

                {/* Status & Preview */}
                <div className="space-y-8">
                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
                        <h4 className="font-black text-slate-900 mb-8 uppercase tracking-[0.2em] text-[10px]">Monitoramento Live</h4>
                        <div className="space-y-4">
                            {recentEvents.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Clock className="mx-auto mb-2 opacity-20" size={32} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Aguardando...</p>
                                </div>
                            ) : recentEvents.map((event) => (
                                <div key={event.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group cursor-default animate-fade-in">
                                    <div className={clsx(
                                        "w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center shrink-0",
                                        event.status === 'GRANTED' ? "text-[#22c55e]" : "text-red-500"
                                    )}>
                                        {event.status === 'GRANTED' ? <CheckCircle size={24} /> : <XCircle size={24} />}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-base font-black text-slate-900 truncate">{event.name}</p>
                                        <p className={clsx(
                                            "text-[10px] font-black uppercase tracking-widest",
                                            event.status === 'GRANTED' ? "text-slate-400" : "text-red-400"
                                        )}>
                                            {event.status === 'GRANTED' ? 'ACESSO LIBERADO' : (event.reason || 'NEGADO')}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-300 uppercase">{event.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-orange-500 p-10 rounded-[3rem] shadow-2xl shadow-orange-500/20 text-white group cursor-pointer relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                <ShieldCheck size={32} />
                            </div>
                            <h4 className="text-2xl font-black mb-2 tracking-tight">Segurança Ativada</h4>
                            <p className="text-sm font-bold opacity-80 leading-relaxed uppercase tracking-tighter">O sistema bloqueia acessos duplicados e planos vencidos automaticamente no hardware.</p>
                        </div>
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
