import { useState } from 'react';
import { Search, Filter, MessageSquare, Clock, Zap } from 'lucide-react';
import clsx from 'clsx';

export const Leads = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLead, setSelectedLead] = useState<any>(null);

    const leads = [
        { id: 1, name: 'Marco Lanches', lastMessage: '[Imagem]', time: '12:22', status: 'pending' },
        // Add more mock leads if needed
    ];

    return (
        <div className="flex h-full bg-slate-50/50 rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm animate-fade-in">
            {/* Sidebar List */}
            <div className="w-80 border-r border-slate-100 bg-white flex flex-col">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black text-slate-900">Leads</h2>
                        <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                            <Filter size={20} />
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar interessados..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all font-medium text-slate-700 text-sm"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
                    {leads.map((lead) => (
                        <button
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className={clsx(
                                "w-full flex items-center gap-4 p-4 rounded-3xl transition-all text-left",
                                selectedLead?.id === lead.id ? "bg-slate-50 border-slate-100" : "hover:bg-slate-50/50"
                            )}
                        >
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                                {lead.name.charAt(0)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="font-black text-slate-900 truncate">{lead.name}</h4>
                                    <span className="text-[10px] font-bold text-slate-400">{lead.time}</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium truncate">{lead.lastMessage}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-white/30 backdrop-blur-sm flex items-center justify-center p-12">
                {!selectedLead ? (
                    <div className="max-w-md text-center animate-fade-in-up">
                        <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-primary/10 flex items-center justify-center text-primary mx-auto mb-8">
                            <Zap size={48} fill="currentColor" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-4">Bem-vindo ao Leads Hub</h2>
                        <p className="text-slate-500 font-medium mb-8">Selecione um contato ao lado para iniciar um atendimento manual.</p>
                        <p className="text-primary font-black text-sm uppercase tracking-widest">Transforme interessados em alunos reais!</p>

                        <div className="grid grid-cols-2 gap-4 mt-12 pt-12 border-t border-slate-100">
                            <div className="bg-white p-6 rounded-3xl shadow-sm text-left">
                                <Clock size={20} className="text-slate-400 mb-4" />
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">HISTÓRICO</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight">Mensagens protegidas no banco de dados.</p>
                            </div>
                            <div className="bg-white p-6 rounded-3xl shadow-sm text-left">
                                <MessageSquare size={20} className="text-slate-400 mb-4" />
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">WHATSAPP</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight">Conectado via Baileys Multi-Device.</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col">
                        {/* Chat interface could go here */}
                        <div className="p-8 border-b border-slate-100 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">
                                {selectedLead.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900">{selectedLead.name}</h3>
                                <p className="text-xs text-green-500 font-bold uppercase tracking-widest">Online via WhatsApp</p>
                            </div>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto space-y-4">
                            <div className="bg-slate-50 p-4 rounded-2xl max-w-[80%]">
                                <p className="text-sm font-medium text-slate-700">{selectedLead.lastMessage}</p>
                                <span className="text-[10px] text-slate-400 font-bold mt-2 block">{selectedLead.time}</span>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="bg-slate-50 p-4 rounded-3xl flex items-center gap-4">
                                <input
                                    type="text"
                                    placeholder="Digite uma mensagem..."
                                    className="bg-transparent border-none flex-1 focus:ring-0 font-medium text-sm"
                                />
                                <button className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                                    <MessageSquare size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
