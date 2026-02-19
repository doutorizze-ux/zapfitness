
import React, { useState, useEffect, useRef } from 'react';
import {
    Search, Plus, Filter, MessageSquare, Phone, ArrowRight, User,
    DollarSign, CheckCircle, XCircle, Clock, LayoutGrid, List,
    MoreVertical, Send, X, ChevronRight, TrendingUp, Users, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import clsx from 'clsx';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';

interface Lead {
    id: string;
    name: string | null;
    phone: string;
    status: 'new' | 'negotiating' | 'financing' | 'won' | 'lost';
    value: number;
    last_message: string | null;
    last_message_at: string;
    created_at: string;
}

interface Message {
    id: string;
    content: string;
    from_me: boolean;
    created_at: string;
    type: string;
}

const COLUMNS = [
    { id: 'new', label: 'NOVOS LEADS', color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { id: 'negotiating', label: 'EM NEGOCIAÇÃO', color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-600' },
    { id: 'financing', label: 'FINANCIAMENTO', color: 'bg-purple-500', lightColor: 'bg-purple-50', textColor: 'text-purple-600' },
    { id: 'won', label: 'VENDA FEITA', color: 'bg-green-500', lightColor: 'bg-green-50', textColor: 'text-green-600' },
    { id: 'lost', label: 'PERDIDOS', color: 'bg-slate-500', lightColor: 'bg-slate-50', textColor: 'text-slate-600' },
];

export const Leads = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const fetchLeads = async () => {
        try {
            const res = await api.get('/leads');
            setLeads(res.data);
        } catch (err) {
            console.error('Error fetching leads:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();

        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
            transports: ['websocket', 'polling']
        });

        if (user?.tenant_id) {
            socket.emit('join', user.tenant_id);
        }

        socket.on('new_message', (msg: any) => {
            // Refresh leads list to update last message
            fetchLeads();

            // If the message belongs to the selected lead, add it to chat
            if (selectedLead && (msg.lead_id === selectedLead.id)) {
                setMessages(prev => [...prev, msg]);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [user, selectedLead]);

    useEffect(() => {
        if (selectedLead) {
            fetchMessages(selectedLead.id);
        }
    }, [selectedLead]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchMessages = async (leadId: string) => {
        try {
            const res = await api.get(`/leads/${leadId}/messages`);
            setMessages(res.data);
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLead || !newMessage.trim() || sending) return;

        setSending(true);
        try {
            await api.post(`/leads/${selectedLead.id}/messages`, { content: newMessage });

            // Optimistic update
            const optimisticMsg: Message = {
                id: Date.now().toString(),
                content: newMessage,
                from_me: true,
                created_at: new Date().toISOString(),
                type: 'text'
            };
            setMessages(prev => [...prev, optimisticMsg]);
            setNewMessage('');
            fetchLeads(); // Update last message in list
        } catch (err) {
            console.error('Error sending message:', err);
        } finally {
            setSending(false);
        }
    };

    const updateLeadStatus = async (leadId: string, status: string) => {
        try {
            await api.put(`/leads/${leadId}`, { status });
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: status as any } : l));
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    const stats = {
        total: leads.length,
        hot: leads.filter(l => l.status === 'new').length,
        conversion: leads.length > 0 ? ((leads.filter(l => l.status === 'won').length / leads.length) * 100).toFixed(1) : 0,
        potential: leads.reduce((acc, l) => acc + (l.status !== 'lost' && l.status !== 'won' ? l.value : 0), 0),
        won: leads.filter(l => l.status === 'won').reduce((acc, l) => acc + l.value, 0)
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-2 tracking-tighter">CRM de <span className="text-primary">Vendas</span></h1>
                    <p className="text-slate-500 font-medium">Acompanhe seus leads e converta mais interessados em alunos.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                        <Filter size={18} />
                        Filtros
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/25 hover:scale-105 transition-all">
                        <Plus size={20} />
                        Novo Lead
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                            <Users size={24} />
                        </div>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Leads Totais</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900">{stats.total}</span>
                        <span className="text-xs font-bold text-green-500">+{stats.hot} Hot</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                            <Target size={24} />
                        </div>
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Conversão</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900">{stats.conversion}%</span>
                        <span className="text-xs font-bold text-slate-400">Status: Ganhos</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500">
                            <Clock size={24} />
                        </div>
                        <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Em Aberto</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900">R$ {stats.potential.toLocaleString('pt-BR')}</span>
                        <span className="text-xs font-bold text-slate-400">Valor potencial</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-500">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Faturado</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900">R$ {stats.won.toLocaleString('pt-BR')}</span>
                        <span className="text-xs font-bold text-slate-400">Vendas concluídas</span>
                    </div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex justify-end mb-6">
                <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                    <button
                        onClick={() => setView('kanban')}
                        className={clsx("p-2 rounded-lg transition-all", view === 'kanban' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => setView('list')}
                        className={clsx("p-2 rounded-lg transition-all", view === 'list' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                        <List size={20} />
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            {view === 'kanban' ? (
                <div className="flex gap-4 overflow-x-auto pb-6 -mx-4 md:-mx-10 px-4 md:px-10 snap-x">
                    {COLUMNS.map(col => (
                        <div key={col.id} className="min-w-[320px] w-80 shrink-0 snap-start">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <div className="flex items-center gap-2">
                                    <div className={clsx("w-3 h-3 rounded-full", col.color)}></div>
                                    <h3 className="font-black text-[11px] text-slate-500 uppercase tracking-[0.2em]">{col.label}</h3>
                                    <span className="ml-2 bg-slate-200 text-slate-600 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full">
                                        {leads.filter(l => l.status === col.id).length}
                                    </span>
                                </div>
                                <button className="text-slate-400 hover:text-slate-600"><Plus size={16} /></button>
                            </div>

                            <div className="bg-slate-100/50 p-3 rounded-[2rem] border border-slate-200 min-h-[400px]">
                                {leads.filter(l => l.status === col.id).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 opacity-50">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-2">
                                            <Target size={20} />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Vazio</span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {leads.filter(l => l.status === col.id).map(lead => (
                                            <motion.div
                                                layoutId={lead.id}
                                                key={lead.id}
                                                onClick={() => setSelectedLead(lead)}
                                                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                                                            {lead.name?.charAt(0) || lead.phone.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 text-sm group-hover:text-primary transition-colors">{lead.name || 'Sem Nome'}</h4>
                                                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                                <Phone size={10} />
                                                                {lead.phone}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button className="text-slate-300 hover:text-slate-500"><MoreVertical size={16} /></button>
                                                </div>

                                                {lead.last_message && (
                                                    <p className="text-xs text-slate-500 mb-4 line-clamp-2 bg-slate-50 p-2 rounded-xl italic">
                                                        "{lead.last_message}"
                                                    </p>
                                                )}

                                                <div className="flex items-center justify-between text-[10px] font-black group/actions">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                                                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                                                        >
                                                            <MessageSquare size={14} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${lead.phone}`, '_blank'); }}
                                                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                                        >
                                                            <Phone size={14} />
                                                        </button>
                                                    </div>

                                                    <select
                                                        value={lead.status}
                                                        onChange={(e) => { e.stopPropagation(); updateLeadStatus(lead.id, e.target.value); }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="bg-slate-50 border-none text-slate-500 rounded-lg p-1 text-[9px] uppercase tracking-widest outline-none focus:ring-1 focus:ring-primary h-8"
                                                    >
                                                        {COLUMNS.map(c => (
                                                            <option key={c.id} value={c.id}>{c.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-8 py-5">Lead</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5">Valor</th>
                                <th className="px-8 py-5">Último Contato</th>
                                <th className="px-8 py-5">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {leads.map(lead => (
                                <tr key={lead.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedLead(lead)}>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                                                {lead.name?.charAt(0) || lead.phone.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{lead.name || 'Sem nome'}</div>
                                                <div className="text-xs text-slate-400">{lead.phone}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={clsx(
                                            "inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                            COLUMNS.find(c => c.id === lead.status)?.textColor,
                                            COLUMNS.find(c => c.id === lead.status)?.lightColor
                                        )}>
                                            {COLUMNS.find(c => c.id === lead.status)?.label}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-slate-900 text-sm">R$ {lead.value.toLocaleString('pt-BR')}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-xs text-slate-500 font-medium">{format(new Date(lead.last_message_at), 'dd/MM HH:mm')}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex gap-2">
                                            <button className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-primary/10 hover:text-primary transition-all">
                                                <MessageSquare size={16} />
                                            </button>
                                            <button className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all">
                                                <MoreVertical size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Integrated Chat Overlay */}
            <AnimatePresence>
                {selectedLead && (
                    <motion.div
                        initial={{ opacity: 0, x: 400 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 400 }}
                        className="fixed top-0 right-0 w-full sm:w-[450px] h-full bg-white shadow-2xl z-[100] border-l border-slate-200 flex flex-col overflow-hidden"
                    >
                        {/* Chat Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden">
                                    {selectedLead.name?.charAt(0) || 'L'}
                                </div>
                                <div>
                                    <h2 className="font-black text-slate-900 tracking-tight">{selectedLead.name || 'Lead'}</h2>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{selectedLead.phone}</p>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedLead(null)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Status Change in Chat */}
                        <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estágio do Funil:</span>
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedLead.status}
                                    onChange={(e) => updateLeadStatus(selectedLead.id, e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold text-slate-600 outline-none focus:ring-1 focus:ring-primary"
                                >
                                    {COLUMNS.map(c => (
                                        <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50 space-y-4">
                                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm">
                                        <MessageSquare size={32} />
                                    </div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-center">Nenhuma mensagem ainda.<br />Inicie a conversa!</p>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, i) => (
                                        <div key={msg.id || i} className={clsx("flex", msg.from_me ? "justify-end" : "justify-start")}>
                                            <div className={clsx(
                                                "max-w-[85%] p-4 rounded-2xl shadow-sm text-sm font-medium leading-relaxed mb-1",
                                                msg.from_me
                                                    ? "bg-primary text-white rounded-br-none"
                                                    : "bg-white text-slate-800 rounded-bl-none border border-slate-100"
                                            )}>
                                                {msg.content}
                                                <div className={clsx(
                                                    "text-[8px] font-bold uppercase mt-2",
                                                    msg.from_me ? "text-white/60" : "text-slate-400"
                                                )}>
                                                    {format(new Date(msg.created_at), 'HH:mm')}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef}></div>
                                </>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-6 border-t border-slate-100 bg-white">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Digite sua resposta..."
                                    className="flex-1 bg-slate-100 border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-1 focus:ring-primary"
                                />
                                <button
                                    disabled={!newMessage.trim() || sending}
                                    type="submit"
                                    className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                >
                                    <Send size={20} className={clsx(sending && "animate-pulse")} />
                                </button>
                            </form>
                            <div className="mt-3 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Canais de Venda: WhatsApp Ativado</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Backdrop for Chat */}
            {selectedLead && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90]"
                    onClick={() => setSelectedLead(null)}
                />
            )}
        </div>
    );
};
