import { useState, useEffect } from 'react';
import { useTutorial } from '../contexts/TutorialContext';
import { Cpu, Wifi, CheckCircle, Download, ExternalLink, ShieldCheck, XCircle, Clock } from 'lucide-react';
import clsx from 'clsx';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

export const Turnstiles = () => {
    const { user } = useAuth();
    const [selectedBrand, setSelectedBrand] = useState('generic');
    const [token, setToken] = useState('Carregando...');
    const [recentEvents, setRecentEvents] = useState<any[]>([]);

    const { startTutorial, hasSeenTutorial } = useTutorial();

    useEffect(() => {
        fetchConfig();
        fetchRecentLogs();

        if (!hasSeenTutorial('turnstiles')) {
            startTutorial('turnstiles');
        }

        if (user?.tenant_id) {
            socket.emit('join_room', { room: user.tenant_id });

            socket.on('gate:open', (data) => {
                setRecentEvents(prev => [{
                    id: Math.random().toString(),
                    name: data.memberName,
                    status: 'GRANTED',
                    time: new Date(data.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                }, ...prev].slice(0, 5));
            });

            socket.on('gate:denied', (data) => {
                setRecentEvents(prev => [{
                    id: Math.random().toString(),
                    name: data.memberName || 'Visitante/Inativo',
                    status: 'DENIED',
                    reason: data.reason,
                    time: new Date(data.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                }, ...prev].slice(0, 5));
            });
        }

        return () => {
            socket.off('gate:open');
            socket.off('gate:denied');
        };
    }, [user?.tenant_id]);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/gate/config');
            setToken(res.data.gate_token);
            setSelectedBrand(res.data.turnstile_brand || 'generic');
        } catch (err) {
            console.error(err);
        }
    };

    const fetchRecentLogs = async () => {
        try {
            const res = await api.get('/logs');
            const formatted = res.data.slice(0, 5).map((log: any) => ({
                id: log.id,
                name: log.member?.name || 'Desconhecido',
                status: log.status,
                time: new Date(log.scanned_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }));
            setRecentEvents(formatted);
        } catch (err) {
            console.error('Erro ao buscar logs recentes:', err);
        }
    };

    const handleRegenerateToken = async () => {
        if (!confirm('Tem certeza? O ZappBridge atual irá parar de funcionar até ser atualizado com o novo token.')) return;
        try {
            const res = await api.post('/gate/regenerate-token');
            setToken(res.data.gate_token);
        } catch (err) {
            alert('Erro ao regenerar token');
        }
    };

    const handleBrandChange = async (brand: string) => {
        setSelectedBrand(brand);
        try {
            await api.put('/gate/brand', { brand });
        } catch (err) {
            console.error('Erro ao salvar marca');
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
            alert('Erro ao baixar arquivo. Verifique se o token foi gerado.');
        }
    };

    const handleShowGuide = async () => {
        try {
            const res = await api.get('/gate/guide');
            alert(res.data.guide);
        } catch (err) {
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
                <div className="lg:col-span-2 space-y-6">
                    <div id="turnstiles-brands" className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100">
                        <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
                            <Cpu className="text-orange-500" />
                            Selecione sua Marca
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {brands.map((brand) => (
                                <button
                                    key={brand.id}
                                    onClick={() => handleBrandChange(brand.id)}
                                    className={clsx(
                                        "p-6 rounded-3xl border-2 text-left transition-all duration-300 group",
                                        selectedBrand === brand.id
                                            ? "border-orange-500 bg-orange-50/50"
                                            : "border-slate-50 bg-slate-50/30 hover:border-slate-200 hover:bg-white"
                                    )}
                                >
                                    <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{brand.logo}</div>
                                    <div className="font-black text-slate-900 mb-1">{brand.name}</div>
                                    <div className="text-xs text-slate-500 font-bold leading-tight uppercase tracking-tighter">{brand.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Configuration Panel */}
                    <div id="turnstiles-config" className="bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 text-white relative overflow-hidden shadow-2xl">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div className="p-4 bg-white/10 rounded-2xl">
                                    <Wifi className="text-primary" size={32} />
                                </div>
                                <span className="bg-green-500/20 text-green-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/30">
                                    Servidor Pronto
                                </span>
                            </div>

                            <h4 className="text-2xl font-black mb-4">Como conectar?</h4>
                            <div className="space-y-6">
                                {selectedBrand === 'controlid' ? (
                                    <div className="space-y-4">
                                        <p className="text-slate-400 font-medium text-sm leading-relaxed whitespace-normal">As catracas Control iD podem se conectar diretamente ao nosso servidor sem precisar de um computador ligado na recepção.</p>
                                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                                            <div className="text-xs font-black text-primary uppercase tracking-widest mb-4">Configuração na Catraca</div>
                                            <div className="space-y-3 font-mono text-sm">
                                                <div className="flex flex-col sm:flex-row justify-between border-b border-white/5 pb-2 overflow-hidden gap-2">
                                                    <span className="text-slate-500 shrink-0">URL do Servidor:</span>
                                                    <span className="text-white truncate">api.zapp.fitness/gate</span>
                                                </div>
                                                <div className="flex flex-col sm:flex-row justify-between pt-1 gap-2">
                                                    <span className="text-slate-500 shrink-0">Seu Token:</span>
                                                    <div className="flex items-center justify-between sm:justify-end gap-2 overflow-hidden">
                                                        <span className="text-primary font-bold truncate select-all">{token}</span>
                                                        <button onClick={handleRegenerateToken} className="text-[10px] bg-white/10 px-2 py-1 rounded hover:bg-white/20 shrink-0">Regerar</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-slate-400 font-medium text-sm leading-relaxed whitespace-normal">Marcas como Topdata e Henry precisam do nosso agente local (ZappBridge) instalado no PC da recepção.</p>
                                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-6">
                                            <div className="text-xs font-black text-primary uppercase tracking-widest mb-2">Seu Token de Acesso</div>
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-lg md:text-xl font-mono font-bold text-primary truncate">{token}</span>
                                                <button onClick={handleRegenerateToken} className="text-xs bg-white/10 px-3 py-1 rounded-lg hover:bg-white/20 transition-colors shrink-0">Novo Token</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:flex sm:flex-row gap-4">
                                            <button
                                                onClick={handleDownload}
                                                className="bg-primary text-white px-6 md:px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 text-sm md:text-base"
                                            >
                                                <Download size={20} />
                                                Baixar ZappBridge (.js)
                                            </button>
                                            <button
                                                onClick={handleShowGuide}
                                                className="bg-white/5 border border-white/10 text-white px-6 md:px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-sm md:text-base"
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
                <div className="space-y-6">
                    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-slate-100">
                        <h4 className="font-black text-slate-900 mb-6 uppercase tracking-widest text-xs">Monitoramento Live</h4>
                        <div className="space-y-4">
                            {recentEvents.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    <Clock className="mx-auto mb-2 opacity-20" size={32} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Aguardando...</p>
                                </div>
                            ) : recentEvents.map((event) => (
                                <div key={event.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group cursor-default animate-fade-in">
                                    <div className={clsx(
                                        "w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center",
                                        event.status === 'GRANTED' ? "text-green-500" : "text-red-500"
                                    )}>
                                        {event.status === 'GRANTED' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-black text-slate-900 truncate">{event.name}</p>
                                        <p className={clsx(
                                            "text-[10px] font-black uppercase tracking-widest",
                                            event.status === 'GRANTED' ? "text-slate-400" : "text-red-400"
                                        )}>
                                            {event.status === 'GRANTED' ? 'ACESSO LIBERADO' : (event.reason || 'NEGADO')}
                                        </p>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-300">{event.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-orange-500 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-orange-500/20 text-white group cursor-pointer relative overflow-hidden">
                        <div className="relative z-10">
                            <ShieldCheck className="mb-4 group-hover:scale-110 transition-transform" size={40} />
                            <h4 className="text-xl font-black mb-2">Segurança Ativada</h4>
                            <p className="text-sm font-bold opacity-80 leading-relaxed">O sistema bloqueia acessos duplicados e planos vencidos automaticamente no hardware.</p>
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
