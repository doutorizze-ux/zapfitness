
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Plus, MessageSquare, Phone,
    LayoutGrid, List, Search, Trash2, Edit,
    Send, X, Users, Target, Calendar, TrendingUp,
    Sparkles, RefreshCw, Flame, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import clsx from 'clsx';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

interface Lead {
    id: string;
    name: string | null;
    phone: string;
    status: 'new' | 'contacted' | 'trial' | 'won' | 'lost';
    value: number;
    last_message: string | null;
    last_message_at: string;
    created_at: string;
    ai_intent?: 'cold' | 'warm' | 'hot' | null;
    ai_topic?: 'pricing' | 'trial' | 'schedule' | 'location' | 'enrollment' | 'cancellation' | 'other' | null;
    ai_objection?: 'none' | 'price' | 'schedule' | 'location' | 'trust' | 'other' | null;
    ai_sentiment?: 'interested' | 'neutral' | 'frustrated' | 'urgent' | null;
    ai_next_action?: 'send_plans' | 'invite_trial' | 'human_follow_up' | 'nurture' | null;
    ai_priority?: number | null;
    ai_qualified?: boolean | null;
    ai_needs_human?: boolean | null;
    ai_is_spam?: boolean | null;
    ai_confidence?: number | null;
    ai_analyzed_at?: string | null;
}

interface Message {
    id: string;
    content: string;
    from_me: boolean;
    created_at: string;
    type: string;
    status?: 'sending' | 'sent' | 'failed';
}

const COLUMNS = [
    { id: 'new', label: 'INTERESSADOS', color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-600', shadow: 'shadow-blue-500/20' },
    { id: 'contacted', label: 'CONTATO FEITO', color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-600', shadow: 'shadow-orange-500/20' },
    { id: 'trial', label: 'AULA EXPERIMENTAL', color: 'bg-purple-500', lightColor: 'bg-purple-50', textColor: 'text-purple-600', shadow: 'shadow-purple-500/20' },
    { id: 'won', label: 'MATRICULADO', color: 'bg-green-500', lightColor: 'bg-green-50', textColor: 'text-green-600', shadow: 'shadow-green-500/20' },
    { id: 'lost', label: 'PERDIDO', color: 'bg-slate-500', lightColor: 'bg-slate-50', textColor: 'text-slate-600', shadow: 'shadow-slate-500/20' },
] as const;

const formatCurrency = (value: number | null | undefined) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const AI_INTENT_LABEL = {
    cold: 'Frio',
    warm: 'Morno',
    hot: 'Quente',
} as const;

const AI_ACTION_LABEL = {
    send_plans: 'Enviar planos',
    invite_trial: 'Convidar para aula',
    human_follow_up: 'Responder agora',
    nurture: 'Acompanhar depois',
} as const;

const AI_TOPIC_LABEL = {
    pricing: 'Preço e planos',
    trial: 'Aula experimental',
    schedule: 'Horários',
    location: 'Localização',
    enrollment: 'Matrícula',
    cancellation: 'Cancelamento',
    other: 'Outro assunto',
} as const;

const AI_OBJECTION_LABEL = {
    none: 'Sem objeção',
    price: 'Preço',
    schedule: 'Horário',
    location: 'Distância',
    trust: 'Confiança',
    other: 'Outra objeção',
} as const;

const AI_SENTIMENT_LABEL = {
    interested: 'Interessado',
    neutral: 'Neutro',
    frustrated: 'Frustrado',
    urgent: 'Com pressa',
} as const;

const LeadAiSummary = ({ lead }: { lead: Lead }) => {
    if (!lead.ai_analyzed_at || !lead.ai_intent || !lead.ai_next_action) return null;

    const priority = lead.ai_priority === null || lead.ai_priority === undefined
        ? null
        : lead.ai_priority >= 1.5 ? 'Alta' : lead.ai_priority >= 0.75 ? 'Média' : 'Baixa';

    return (
        <div className="mb-4 rounded-2xl border border-violet-100 bg-violet-50/70 p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-violet-700">Análise Jev</span>
                <span className={clsx(
                    'rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest',
                    lead.ai_intent === 'hot' ? 'bg-emerald-100 text-emerald-700' : lead.ai_intent === 'warm' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                )}>
                    {AI_INTENT_LABEL[lead.ai_intent]}
                </span>
            </div>
            <p className="text-[11px] font-bold leading-relaxed text-slate-700">
                Próxima ação: <span className="text-violet-700">{AI_ACTION_LABEL[lead.ai_next_action]}</span>
                {priority && <> · Prioridade {priority}</>}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {lead.ai_topic && <span className="rounded-lg bg-white px-2 py-1 text-[9px] font-bold text-slate-600">{AI_TOPIC_LABEL[lead.ai_topic]}</span>}
                {lead.ai_objection && lead.ai_objection !== 'none' && <span className="rounded-lg bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">Objeção: {AI_OBJECTION_LABEL[lead.ai_objection]}</span>}
                {lead.ai_sentiment && <span className="rounded-lg bg-white px-2 py-1 text-[9px] font-bold text-slate-600">{AI_SENTIMENT_LABEL[lead.ai_sentiment]}</span>}
            </div>
            {lead.ai_qualified && (
                <p className="mt-1 text-[10px] font-bold text-emerald-700">✓ Vale atendimento comercial agora</p>
            )}
            {lead.ai_needs_human && <p className="mt-1 text-[10px] font-bold text-blue-700">● Precisa de atenção humana</p>}
            {lead.ai_is_spam && <p className="mt-1 text-[10px] font-bold text-red-700">⚠ Possível spam — revisar</p>}
            {lead.ai_confidence !== null && lead.ai_confidence !== undefined && lead.ai_confidence < 0.5 && (
                <p className="mt-1 text-[10px] font-bold text-slate-500">Análise incerta — confirme manualmente</p>
            )}
        </div>
    );
};

const getSocketUrl = () => {
    const configuredUrl = import.meta.env.VITE_API_URL;
    if (configuredUrl) {
        const withoutApi = configuredUrl.replace(/\/api\/?$/, '');
        if (withoutApi && withoutApi !== '/') return withoutApi;
    }

    if (typeof window !== 'undefined') return window.location.origin;
    return 'http://localhost:3000';
};

export const Leads = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [analyzingLeadId, setAnalyzingLeadId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [aiFilter, setAiFilter] = useState<'all' | 'hot' | 'human' | 'spam'>('all');
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [modalLead, setModalLead] = useState<Partial<Lead> | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const selectedLeadRef = useRef<Lead | null>(null);

    useEffect(() => {
        selectedLeadRef.current = selectedLead;
    }, [selectedLead]);

    const fetchLeads = useCallback(async () => {
        try {
            const res = await api.get('/leads');
            setLeads(res.data);
        } catch (err) {
            console.error('Error fetching leads:', err);
            toast.error('Erro ao buscar leads');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeads();

        const socket = io(getSocketUrl(), {
            transports: ['websocket', 'polling'],
            withCredentials: true,
        });

        const joinTenantRoom = () => {
            if (user?.tenant_id) socket.emit('join', user.tenant_id);
        };

        socket.on('connect', joinTenantRoom);
        if (socket.connected) {
            joinTenantRoom();
        }

        const handleNewMessage = (msg: Message & { lead_id?: string }) => {
            void fetchLeads();
            const activeLead = selectedLeadRef.current;
            if (activeLead && msg.lead_id === activeLead.id) {
                setMessages(prev => prev.some(message => message.id === msg.id) ? prev : [...prev, msg]);
            }
        };

        const handleLeadAnalyzed = (analyzedLead: Lead) => {
            setLeads(prev => prev.map(lead => lead.id === analyzedLead.id ? analyzedLead : lead));
            setSelectedLead(prev => prev?.id === analyzedLead.id ? analyzedLead : prev);
        };

        socket.on('new_message', handleNewMessage);
        socket.on('lead_analyzed', handleLeadAnalyzed);

        return () => {
            socket.off('connect', joinTenantRoom);
            socket.off('new_message', handleNewMessage);
            socket.off('lead_analyzed', handleLeadAnalyzed);
            socket.disconnect();
        };
    }, [user?.tenant_id, fetchLeads]);

    useEffect(() => {
        if (!selectedLead) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [selectedLead]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }, [messages]);

    const fetchMessages = useCallback(async (leadId: string) => {
        try {
            const res = await api.get(`/leads/${leadId}/messages`);
            setMessages(res.data);
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    }, []);

    useEffect(() => {
        if (selectedLead) {
            fetchMessages(selectedLead.id);
        }
    }, [selectedLead, fetchMessages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = newMessage.trim();
        if (!selectedLead || !content || sending) return;

        const leadId = selectedLead.id;
        const optimisticId = `pending-${Date.now()}`;
        const optimisticMsg: Message = {
            id: optimisticId,
            content,
            from_me: true,
            created_at: new Date().toISOString(),
            type: 'text',
            status: 'sending'
        };

        setSending(true);
        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');

        try {
            await api.post(`/leads/${leadId}/messages`, { content });
            setMessages(prev => prev.map(message =>
                message.id === optimisticId ? { ...message, status: 'sent' } : message
            ));
            void fetchLeads();
        } catch (err: any) {
            console.error('Error sending message:', err);
            setMessages(prev => prev.map(message =>
                message.id === optimisticId ? { ...message, status: 'failed' } : message
            ));
            setNewMessage(current => current || content);
            toast.error(err?.response?.data?.error || 'Não foi possível enviar a mensagem');
        } finally {
            setSending(false);
        }
    };

    const updateLeadStatus = async (leadId: string, status: string) => {
        try {
            await api.put(`/leads/${leadId}`, { status });
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: status as Lead['status'] } : l));
            setSelectedLead(prev => prev?.id === leadId ? { ...prev, status: status as Lead['status'] } : prev);
            toast.success('Status atualizado');
        } catch (err) {
            console.error('Error updating status:', err);
            toast.error('Erro ao atualizar status');
        }
    };

    const handleSaveLead = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalLead?.phone) return;

        try {
            if (modalLead.id) {
                await api.put(`/leads/${modalLead.id}`, modalLead);
                toast.success('Lead atualizado com sucesso');
            } else {
                await api.post('/leads', modalLead);
                toast.success('Lead criado com sucesso');
            }
            setShowLeadModal(false);
            setModalLead(null);
            fetchLeads();
        } catch (err) {
            console.error('Error saving lead:', err);
            toast.error('Erro ao salvar lead');
        }
    };

    const handleDeleteLead = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este lead? Todas as mensagens serão perdidas.')) return;
        try {
            await api.delete(`/leads/${id}`);
            setLeads(prev => prev.filter(l => l.id !== id));
            toast.success('Lead excluído');
        } catch (err) {
            console.error('Error deleting lead:', err);
            toast.error('Erro ao excluir lead');
        }
    };

    const analyzeLead = async (leadId: string) => {
        setAnalyzingLeadId(leadId);
        try {
            const response = await api.post(`/leads/${leadId}/analyze`);
            const analyzedLead: Lead = response.data;
            setLeads(prev => prev.map(lead => lead.id === leadId ? analyzedLead : lead));
            setSelectedLead(prev => prev?.id === leadId ? analyzedLead : prev);
            toast.success('Análise Jev atualizada');
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Não foi possível analisar este lead');
        } finally {
            setAnalyzingLeadId(null);
        }
    };

    const filteredLeads = leads.filter(l => {
        const matchesSearch = (l.name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone.includes(searchQuery));
        const matchesStatus = !statusFilter || l.status === statusFilter;
        const matchesAi = aiFilter === 'all'
            || (aiFilter === 'hot' && l.ai_intent === 'hot' && !l.ai_is_spam)
            || (aiFilter === 'human' && l.ai_needs_human === true && !l.ai_is_spam)
            || (aiFilter === 'spam' && l.ai_is_spam === true);
        return matchesSearch && matchesStatus && matchesAi;
    }).sort((a, b) => (b.ai_priority ?? -1) - (a.ai_priority ?? -1));

    const stats = {
        total: leads.length,
        new: leads.filter(l => l.status === 'new').length,
        conversion: leads.length > 0 ? ((leads.filter(l => l.status === 'won').length / leads.length) * 100).toFixed(1) : 0,
        trial: leads.filter(l => l.status === 'trial').length,
        matriculated: leads.filter(l => l.status === 'won').length,
        hot: leads.filter(l => l.ai_intent === 'hot' && !l.ai_is_spam).length,
        human: leads.filter(l => l.ai_needs_human && !l.ai_is_spam).length,
        spam: leads.filter(l => l.ai_is_spam).length,
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className={clsx("pb-20", !selectedLead && "animate-fade-in-up")}>
            {/* Header & Stats */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-10">
                <div className="flex-1">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2 tracking-tighter">
                        Gestão de <span className="text-primary">Leads</span>
                    </h1>
                    <p className="text-slate-500 font-medium max-w-2xl">
                        Acompanhe seus interessados e converta-os em alunos matriculados usando o funil de vendas inteligente.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou telefone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-11 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl w-full sm:w-72 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                        />
                    </div>
                    <button
                        id="btn-new-lead"
                        onClick={() => { setModalLead({ status: 'new' }); setShowLeadModal(true); }}
                        className="flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/25 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus size={20} strokeWidth={3} />
                        Novo Lead
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
                {[
                    { label: 'Leads Totais', value: stats.total, sub: `+${stats.new}`, color: 'blue', icon: Users, filter: null },
                    { label: 'Conversão', value: `${stats.conversion}%`, sub: 'Matrícula', color: 'orange', icon: TrendingUp, filter: 'won' },
                    { label: 'Em Experimento', value: stats.trial, sub: 'Aulas', color: 'purple', icon: Calendar, filter: 'trial' },
                    { label: 'Matriculados', value: stats.matriculated, sub: 'Alunos', color: 'green', icon: Target, filter: 'won' },
                ].map((stat, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -5 }}
                        onClick={() => setStatusFilter(statusFilter === stat.filter ? null : stat.filter)}
                        className={clsx(
                            "bg-white p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm cursor-pointer transition-all",
                            statusFilter === stat.filter && "ring-2 ring-primary border-transparent shadow-lg"
                        )}
                    >
                        <div className="flex items-center justify-between mb-2 md:mb-4">
                            <div className={clsx("w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-2xl flex items-center justify-center",
                                stat.color === 'blue' ? "bg-blue-50 text-blue-500" :
                                    stat.color === 'orange' ? "bg-orange-50 text-orange-500" :
                                        stat.color === 'purple' ? "bg-purple-50 text-purple-500" :
                                            "bg-green-50 text-green-500"
                            )}>
                                <stat.icon size={16} className="md:w-6 md:h-6" />
                            </div>
                            <span className={clsx("text-[8px] md:text-[10px] font-black uppercase tracking-widest",
                                stat.color === 'blue' ? "text-blue-500" :
                                    stat.color === 'orange' ? "text-orange-500" :
                                        stat.color === 'purple' ? "text-purple-500" :
                                            "text-green-500"
                            )}>{stat.label}</span>
                        </div>
                        <div className="flex items-baseline gap-1 md:gap-2">
                            <span className="text-xl md:text-3xl font-black text-slate-900">{stat.value}</span>
                            <span className="text-[10px] md:text-xs font-bold text-slate-400 truncate">{stat.sub}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Jev intelligence queue: read-only filters over stored analysis. */}
            <div className="mb-8 rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-4 md:p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/20">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900">Fila inteligente Jev</p>
                            <p className="text-xs font-medium text-slate-500">Prioriza oportunidades sem alterar o bot ou enviar mensagens.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: 'all', label: 'Todos', count: leads.length, icon: Sparkles },
                            { id: 'hot', label: 'Quentes', count: stats.hot, icon: Flame },
                            { id: 'human', label: 'Atenção humana', count: stats.human, icon: Users },
                            { id: 'spam', label: 'Possível spam', count: stats.spam, icon: ShieldAlert },
                        ].map(item => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setAiFilter(item.id as typeof aiFilter)}
                                className={clsx(
                                    'flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all',
                                    aiFilter === item.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'border border-violet-100 bg-white text-slate-600 hover:border-violet-300'
                                )}
                            >
                                <item.icon size={14} /> {item.label} <span className="rounded-md bg-black/10 px-1.5 py-0.5">{item.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* View Toggle & Active Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto no-scrollbar">
                    <button
                        onClick={() => setStatusFilter(null)}
                        className={clsx(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                            !statusFilter ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                        )}
                    >
                        Todos
                    </button>
                    {COLUMNS.map(col => (
                        <button
                            key={col.id}
                            onClick={() => setStatusFilter(col.id)}
                            className={clsx(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                                statusFilter === col.id ? `${col.color} text-white shadow-lg` : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                            )}
                        >
                            {col.label}
                        </button>
                    ))}
                </div>

                <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1.5">
                    <button
                        onClick={() => setView('kanban')}
                        className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs", view === 'kanban' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        <LayoutGrid size={16} />
                        Kanban
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs", view === 'list' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        <List size={16} />
                        Lista
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {view === 'kanban' ? (
                <div id="leads-kanban" className="flex gap-4 md:gap-6 overflow-x-auto pb-8 -mx-4 md:-mx-10 px-4 md:px-10 snap-x no-scrollbar">
                    {COLUMNS.map(col => (
                        <div key={col.id} className="min-w-[300px] md:min-w-[340px] w-[85vw] md:w-80 shrink-0 snap-center md:snap-start flex flex-col gap-5">
                            <div className="flex items-center justify-between px-3">
                                <div className="flex items-center gap-2.5">
                                    <div className={clsx("w-3.5 h-3.5 rounded-full ring-4 ring-white shadow-sm", col.color)}></div>
                                    <h3 className="font-black text-[11px] text-slate-900 uppercase tracking-[0.2em]">{col.label}</h3>
                                    <span className="ml-1 bg-slate-200/60 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full ring-1 ring-slate-300">
                                        {leads.filter(l => l.status === col.id).length}
                                    </span>
                                </div>
                                <button
                                    onClick={() => { setModalLead({ status: col.id as Lead['status'] }); setShowLeadModal(true); }}
                                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-all"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>

                            <div className="bg-slate-100/40 p-3 rounded-[2.5rem] border border-slate-200/60 min-h-[500px] flex flex-col gap-3">
                                {filteredLeads.filter(l => l.status === col.id).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center flex-1 text-slate-400/60">
                                        <div className="w-14 h-14 bg-white/50 rounded-3xl flex items-center justify-center mb-3">
                                            <Target size={24} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sem leads aqui</span>
                                    </div>
                                ) : (
                                    <AnimatePresence mode="popLayout">
                                        {filteredLeads.filter(l => l.status === col.id).map(lead => (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                key={lead.id}
                                                onClick={() => setSelectedLead(lead)}
                                                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all cursor-pointer group relative overflow-hidden"
                                            >
                                                <div className={clsx("absolute top-0 left-0 w-1.5 h-full opacity-70", col.color)}></div>

                                                <div className="flex items-start justify-between mb-4 pl-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-700 text-sm border border-slate-100 shadow-inner">
                                                            {lead.name?.charAt(0) || lead.phone.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-slate-900 text-sm group-hover:text-primary transition-colors leading-tight">{lead.name || 'Sem Nome'}</h4>
                                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1 font-bold">
                                                                <Phone size={10} className="text-slate-300" />
                                                                {lead.phone}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setModalLead(lead); setShowLeadModal(true); }}
                                                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-300 hover:text-slate-600 transition-all"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}
                                                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-all"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {lead.last_message ? (
                                                    <div className="mb-4 bg-slate-50/80 p-3.5 rounded-2xl italic border border-slate-100">
                                                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                                            “{lead.last_message}”
                                                        </p>
                                                        <span className="text-[8px] text-slate-400 mt-2 block font-black uppercase tracking-widest">{format(new Date(lead.last_message_at), 'dd/MM HH:mm')}</span>
                                                    </div>
                                                ) : (
                                                    <div className="mb-4 h-12 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Nenhum contato</span>
                                                    </div>
                                                )}

                                                <LeadAiSummary lead={lead} />

                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-2.5">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                                                            className="w-10 h-10 bg-green-50 text-green-600 rounded-2xl hover:bg-green-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                        >
                                                            <MessageSquare size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${lead.phone}`, '_blank'); }}
                                                            className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                        >
                                                            <Phone size={16} />
                                                        </button>
                                                    </div>

                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-2">Valor Estimado</span>
                                                        <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-inner">
                                                            <span className="text-xs font-black text-slate-700">{formatCurrency(lead.value)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                    <select
                                                        aria-label={`Etapa de ${lead.name || lead.phone}`}
                                                        value={lead.status}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                                                        className={clsx(
                                                            "w-full px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer border",
                                                            COLUMNS.find(c => c.id === lead.status)?.lightColor,
                                                            COLUMNS.find(c => c.id === lead.status)?.textColor,
                                                            "border-slate-200"
                                                        )}
                                                    >
                                                        {COLUMNS.map(c => (
                                                            <option key={c.id} value={c.id}>{c.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl md:rounded-[3rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/20">
                    {/* Mobile Card List (md:hidden) */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {filteredLeads.length === 0 ? (
                            <div className="p-10 text-center text-slate-400">Nenhum lead encontrado</div>
                        ) : (
                            filteredLeads.map(lead => (
                                <div key={lead.id} className="p-6 space-y-4 active:bg-slate-50 transition-colors" onClick={() => setSelectedLead(lead)}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-700">
                                                {lead.name?.charAt(0) || lead.phone.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900">{lead.name || 'Sem nome'}</h4>
                                                <p className="text-xs text-slate-400 font-bold">{lead.phone}</p>
                                            </div>
                                        </div>
                                        <div className={clsx(
                                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                            COLUMNS.find(c => c.id === lead.status)?.lightColor,
                                            COLUMNS.find(c => c.id === lead.status)?.textColor
                                        )}>
                                            {COLUMNS.find(c => c.id === lead.status)?.label}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                            {format(new Date(lead.last_message_at), 'dd/MM HH:mm')}
                                        </div>
                                        <div className="text-xs font-black text-slate-700">
                                            {formatCurrency(lead.value)}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                                            className="p-3 bg-slate-100 text-slate-400 rounded-xl"
                                        >
                                            <MessageSquare size={18} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setModalLead(lead); setShowLeadModal(true); }}
                                            className="p-3 bg-slate-100 text-slate-400 rounded-xl"
                                        >
                                            <Edit size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop Table (hidden md:block) */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="px-10 py-6">Lead</th>
                                    <th className="px-10 py-6">Status</th>
                                    <th className="px-10 py-6 text-right">Valor Estimado</th>
                                    <th className="px-10 py-6">Último Contato</th>
                                    <th className="px-10 py-6 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLeads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedLead(lead)}>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center font-black text-slate-700 shadow-sm border border-slate-100">
                                                    {lead.name?.charAt(0) || lead.phone.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-black text-slate-900 group-hover:text-primary transition-colors">{lead.name || 'Sem nome'}</div>
                                                    <div className="text-xs text-slate-400 font-bold mt-0.5">{lead.phone}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <select
                                                value={lead.status}
                                                onChange={(e) => { e.stopPropagation(); updateLeadStatus(lead.id, e.target.value); }}
                                                onClick={(e) => e.stopPropagation()}
                                                className={clsx(
                                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer",
                                                    COLUMNS.find(c => c.id === lead.status)?.lightColor,
                                                    COLUMNS.find(c => c.id === lead.status)?.textColor
                                                )}
                                            >
                                                {COLUMNS.map(c => (
                                                    <option key={c.id} value={c.id}>{c.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <span className="font-black text-slate-700">{formatCurrency(lead.value)}</span>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="text-xs text-slate-500 font-bold">{format(new Date(lead.last_message_at), 'dd/MM HH:mm')}</div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex justify-center gap-3">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                                                    className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    <MessageSquare size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setModalLead(lead); setShowLeadModal(true); }}
                                                    className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id); }}
                                                    className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Integrated Chat Overlay */}
            <AnimatePresence>
                {selectedLead && (
                    <motion.div
                        initial={{ opacity: 0, x: 500 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 500 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full sm:w-[500px] h-[100dvh] max-h-[100dvh] bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-[100] border-l border-slate-100 flex flex-col overflow-hidden"
                    >
                        {/* Chat Header */}
                        <div className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-white relative shrink-0">
                            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                                <div className="w-11 h-11 sm:w-14 sm:h-14 shrink-0 rounded-2xl sm:rounded-[1.5rem] bg-primary/5 flex items-center justify-center text-primary font-black text-lg sm:text-xl border border-primary/10 shadow-inner">
                                    {selectedLead.name?.charAt(0) || 'L'}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="font-black text-slate-900 text-base sm:text-lg tracking-tight leading-tight truncate">{selectedLead.name || 'Lead'}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-black uppercase tracking-[0.12em] sm:tracking-[0.2em] truncate">{selectedLead.phone}</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                aria-label="Fechar conversa"
                                onClick={() => setSelectedLead(null)}
                                className="p-2.5 sm:p-3 shrink-0 hover:bg-slate-100 rounded-2xl transition-all text-slate-300 hover:text-slate-600 border border-transparent hover:border-slate-200 shadow-sm"
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Funnel Stage in Chat */}
                        <div className="px-4 py-3 sm:px-8 sm:py-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-2 h-8 bg-primary rounded-full"></div>
                                <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] sm:tracking-widest pl-1 truncate">Estágio do Funil:</span>
                            </div>
                            <select
                                value={selectedLead.status}
                                onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value)}
                                className={clsx(
                                    "max-w-[55%] px-3 sm:px-5 py-2.5 rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.08em] sm:tracking-widest outline-none shadow-sm transition-all cursor-pointer",
                                    COLUMNS.find(c => c.id === selectedLead.status)?.lightColor,
                                    COLUMNS.find(c => c.id === selectedLead.status)?.textColor,
                                    "border-2",
                                    COLUMNS.find(c => c.id === selectedLead.status)?.textColor.replace('text', 'border')
                                )}
                            >
                                {COLUMNS.map(c => (
                                    <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="px-4 pt-4 sm:px-8 sm:pt-6 bg-[#fcfcfd] shrink-0">
                            <LeadAiSummary lead={selectedLead} />
                            <button
                                type="button"
                                onClick={() => analyzeLead(selectedLead.id)}
                                disabled={analyzingLeadId === selectedLead.id || messages.length === 0}
                                className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-violet-700 transition-all hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RefreshCw size={15} className={clsx(analyzingLeadId === selectedLead.id && 'animate-spin')} />
                                {analyzingLeadId === selectedLead.id ? 'Analisando conversa' : 'Atualizar análise Jev'}
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 sm:p-8 space-y-4 sm:space-y-6 bg-[#fcfcfd]">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300/60 text-center">
                                    <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center shadow-xl shadow-slate-200/50 mb-6 border border-slate-100">
                                        <MessageSquare size={44} strokeWidth={1} />
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-[0.2em]">Inicie o atendimento</p>
                                    <p className="text-xs font-medium text-slate-400 mt-2 max-w-[200px]">As mensagens enviadas aqui serão redirecionadas ao WhatsApp dele.</p>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, i) => (
                                        <div key={msg.id || i} className={clsx("flex", msg.from_me ? "justify-end" : "justify-start")}>
                                            <div className={clsx(
                                                "max-w-[90%] sm:max-w-[85%] p-4 sm:p-5 rounded-3xl shadow-sm text-sm font-medium leading-relaxed mb-1 relative group break-words",
                                                msg.from_me
                                                    ? "bg-slate-900 text-white rounded-tr-none shadow-xl shadow-slate-900/10"
                                                    : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                                            )}>
                                                {msg.content}
                                                <div className={clsx(
                                                    "text-[8px] font-black uppercase mt-3 tracking-widest",
                                                    msg.from_me ? "text-slate-400 text-right font-bold" : "text-slate-400"
                                                )}>
                                                    {format(new Date(msg.created_at), 'HH:mm')}
                                                    {msg.from_me && msg.status === 'sending' && ' • enviando'}
                                                    {msg.from_me && msg.status === 'failed' && ' • não enviado'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef}></div>
                                </>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 sm:p-8 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-8 border-t border-slate-100 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.02)] shrink-0">
                            <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-4">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Digite sua resposta..."
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-[1.8rem] pl-4 sm:pl-6 pr-14 py-4 sm:py-5 text-base sm:text-sm font-black placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all font-medium"
                                    />
                                    <button
                                        aria-label="Enviar mensagem"
                                        disabled={!newMessage.trim() || sending}
                                        type="submit"
                                        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 bg-primary text-white rounded-xl sm:rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                                    >
                                        <Send size={20} className={clsx(sending && "animate-pulse")} />
                                    </button>
                                </div>
                            </form>
                            <div className="mt-3 sm:mt-5 flex items-center justify-center gap-2 sm:gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.14em] sm:tracking-[0.3em]">Canais: WhatsApp Business 2.0</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de Lead (Novo/Editar) */}
            <AnimatePresence>
                {showLeadModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLeadModal(false)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl relative z-[120] overflow-hidden"
                        >
                            <div className="p-10">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                                            {modalLead?.id ? 'Editar' : 'Novo'} <span className="text-primary">Lead</span>
                                        </h2>
                                        <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Informações de Contato</p>
                                    </div>
                                    <button
                                        onClick={() => setShowLeadModal(false)}
                                        className="p-3 hover:bg-slate-100 rounded-2xl text-slate-300 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSaveLead} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Nome Completo</label>
                                        <input
                                            type="text"
                                            required
                                            value={modalLead?.name || ''}
                                            onChange={(e) => setModalLead({ ...modalLead, name: e.target.value })}
                                            placeholder="Ex: João Silva"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Telefone (DDD + Numero)</label>
                                        <input
                                            type="tel"
                                            required
                                            value={modalLead?.phone || ''}
                                            onChange={(e) => setModalLead({ ...modalLead, phone: e.target.value })}
                                            placeholder="Ex: 11999999999"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all shadow-inner"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Estágio</label>
                                            <select
                                                value={modalLead?.status || 'new'}
                                                onChange={(e) => setModalLead({ ...modalLead, status: e.target.value as any })}
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                {COLUMNS.map(c => (
                                                    <option key={c.id} value={c.id}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Valor Estimado</label>
                                            <div className="relative">
                                                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">R$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={modalLead?.value || ''}
                                                    onChange={(e) => setModalLead({ ...modalLead, value: parseFloat(e.target.value) })}
                                                    placeholder="0.00"
                                                    className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-800 focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <button
                                            type="submit"
                                            className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-2xl shadow-slate-900/30 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm uppercase tracking-[0.2em]"
                                        >
                                            {modalLead?.id ? 'Atualizar Lead' : 'Cadastrar Lead'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Backdrop for Chat */}
            {selectedLead && (
                <div
                    className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-[90]"
                    onClick={() => setSelectedLead(null)}
                />
            )}
        </div>
    );
};
