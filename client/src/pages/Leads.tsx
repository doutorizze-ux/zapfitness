import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';
import {
    Search,
    MessageSquare,
    Send,
    User,
    Clock,
    CheckCheck,
    Phone,
    MoreVertical,
    Zap,
    Filter
} from 'lucide-react';
import clsx from 'clsx';

const socket = io(import.meta.env.VITE_API_URL || '/', {
    transports: ['websocket', 'polling']
});

export const Leads = () => {
    const { user } = useAuth();
    const [leads, setLeads] = useState<any[]>([]);
    const [selectedLead, setSelectedLead] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchLeads();

        if (user?.tenant_id) {
            socket.emit('join_room', { room: user.tenant_id });

            socket.on('new_message', (msg) => {
                // Update leads list last message
                setLeads(prev => {
                    const existing = prev.find(l => l.phone === msg.jid.split('@')[0]);
                    if (existing) {
                        return [
                            { ...existing, last_message: msg.content, last_message_at: msg.created_at },
                            ...prev.filter(l => l.id !== existing.id)
                        ];
                    }
                    return prev;
                });

                // If this is the active chat, update messages
                if (selectedLead && msg.jid === selectedLead.jid) {
                    setMessages(prev => [...prev, msg]);
                }
            });
        }

        return () => {
            socket.off('new_message');
        }
    }, [user?.tenant_id, selectedLead]);

    useEffect(() => {
        if (selectedLead) {
            fetchMessages(selectedLead.jid);
        }
    }, [selectedLead]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchLeads = async () => {
        try {
            const res = await api.get('/leads');
            // Transform leads to include JID for uniform messaging
            const formatted = res.data.map((l: any) => ({
                ...l,
                jid: `${l.phone}@s.whatsapp.net`
            }));
            setLeads(formatted);
        } catch (err) {
            console.error('Error fetching leads:', err);
        }
    };

    const fetchMessages = async (jid: string) => {
        setLoading(true);
        try {
            const res = await api.get(`/chat/${encodeURIComponent(jid)}`);
            setMessages(res.data);
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedLead) return;

        const text = newMessage;
        setNewMessage('');

        try {
            await api.post('/chat/send', {
                jid: selectedLead.jid,
                text: text
            });
            // The socket will handle the incoming mirrored message or we add it manually
            // Backend sends 'new_message' event for fromMe: true as well now
        } catch (err) {
            alert('Falha ao enviar mensagem. Verifique se o WhatsApp está conectado.');
        }
    };

    const filteredLeads = leads.filter(l =>
        (l.name?.toLowerCase().includes(search.toLowerCase())) ||
        (l.phone?.includes(search))
    );

    return (
        <div className="h-[calc(100vh-200px)] flex bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
            {/* Contacts Sidebar */}
            <div className="w-full md:w-80 lg:w-96 border-r border-slate-100 flex flex-col bg-slate-50/50">
                <div className="p-6 border-b border-slate-100 bg-white">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Leads</h2>
                        <button className="p-2 text-slate-400 hover:text-orange-500 transition-colors">
                            <Filter size={20} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar interessados..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all placeholder:text-slate-400"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredLeads.length === 0 ? (
                        <div className="p-10 text-center">
                            <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <MessageSquare size={32} />
                            </div>
                            <p className="text-sm font-bold text-slate-400">Nenhum contato encontrado</p>
                        </div>
                    ) : (
                        filteredLeads.map((lead) => (
                            <button
                                key={lead.id}
                                onClick={() => setSelectedLead(lead)}
                                className={clsx(
                                    "w-full p-5 flex gap-4 border-b border-slate-100 transition-all text-left group",
                                    selectedLead?.id === lead.id ? "bg-white shadow-md z-10" : "hover:bg-white"
                                )}
                            >
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                                        {lead.name?.charAt(0) || <User size={20} />}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-50 rounded-full"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h4 className="font-black text-slate-900 truncate pr-2 tracking-tight">
                                            {lead.name || 'Interessado'}
                                        </h4>
                                        <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-tighter">
                                            {lead.last_message_at ? new Date(lead.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium truncate leading-none">
                                        {lead.last_message || 'Sem mensagens'}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white relative">
                {selectedLead ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-5 md:px-8 border-b border-slate-100 flex items-center justify-between z-10 bg-white/80 backdrop-blur-md sticky top-0">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shadow-lg shadow-orange-500/20">
                                    {selectedLead.name?.charAt(0) || <User size={20} />}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 tracking-tight leading-none mb-1">
                                        {selectedLead.name || 'Interessado'}
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">WhatsApp Ativo</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2.5 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded-xl transition-all">
                                    <Phone size={18} />
                                </button>
                                <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                                    <MoreVertical size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed custom-scrollbar">
                            {loading && messages.length === 0 ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                messages.map((msg, i) => (
                                    <div key={i} className={clsx(
                                        "flex flex-col max-w-[80%] md:max-w-[70%]",
                                        msg.from_me ? "ml-auto items-end" : "items-start"
                                    )}>
                                        <div className={clsx(
                                            "p-4 rounded-3xl text-sm font-medium shadow-sm break-words",
                                            msg.from_me
                                                ? "bg-slate-900 text-white rounded-tr-none"
                                                : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                                        )}>
                                            {msg.content}
                                        </div>
                                        <div className="flex items-center gap-1 mt-1.5 px-1">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {msg.from_me && (
                                                <CheckCheck size={12} className="text-orange-500" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 md:p-8 bg-white/80 backdrop-blur-md border-t border-slate-100">
                            <form onSubmit={handleSendMessage} className="flex gap-4 max-w-5xl mx-auto items-center">
                                <div className="flex-1 relative group">
                                    <div className="absolute inset-0 bg-orange-500/5 rounded-[1.5rem] -z-10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                                    <input
                                        type="text"
                                        placeholder="Digite sua mensagem aqui..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-[1.5rem] py-4 px-6 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 transition-all placeholder:text-slate-400 shadow-inner"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="bg-orange-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 hover:bg-orange-600 hover:scale-110 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
                                >
                                    <Send size={24} className="ml-1" />
                                </button>
                            </form>
                            <p className="text-center mt-4 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                                Sua conversa é criptografada de ponta a ponta pelo WhatsApp
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/30">
                        <div className="w-32 h-32 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center mb-8 relative group">
                            <div className="absolute inset-0 bg-orange-500/20 blur-3xl rounded-full scale-125 group-hover:scale-150 transition-transform duration-500"></div>
                            <Zap size={64} className="text-orange-500 fill-orange-500 relative z-10" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Bem-vindo ao Leads Hub</h2>
                        <p className="text-slate-500 font-medium max-w-sm leading-relaxed">
                            Selecione um contato ao lado para iniciar um atendimento manual. <br />
                            <span className="text-orange-500">Transforme interessados em alunos reais!</span>
                        </p>

                        <div className="mt-12 grid grid-cols-2 gap-4 max-w-md w-full">
                            <div className="bg-white p-4 rounded-3xl border border-slate-100 text-left">
                                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center mb-3">
                                    <Clock size={16} />
                                </div>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">Histórico</p>
                                <p className="text-[10px] text-slate-400 font-bold">Mensagens protegidas no banco de dados.</p>
                            </div>
                            <div className="bg-white p-4 rounded-3xl border border-slate-100 text-left">
                                <div className="w-8 h-8 rounded-xl bg-green-50 text-green-500 flex items-center justify-center mb-3">
                                    <Phone size={16} />
                                </div>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">WhatsApp</p>
                                <p className="text-[10px] text-slate-400 font-bold">Conectado via Baileys Multi-Device.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
