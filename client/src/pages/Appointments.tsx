import { useState, useEffect } from 'react';
import api from '../api';
import {
    Calendar as CalendarIcon,
    Plus,
    Clock,
    CheckCircle2,
    XCircle,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Search
} from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Appointments = () => {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // New Appointment Form
    const [formData, setFormData] = useState({
        member_id: '',
        time: '08:00',
        type: 'TREINO',
        notes: ''
    });

    useEffect(() => {
        fetchAppointments();
        fetchMembers();
    }, [selectedDate]);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const res = await api.get(`/appointments?date=${dateStr}`);
            setAppointments(res.data);
        } catch (err) {
            console.error('Erro ao buscar agendamentos:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMembers = async () => {
        try {
            const res = await api.get('/members');
            setMembers(res.data);
        } catch (err) {
            console.error('Erro ao buscar membros:', err);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const [hours, minutes] = formData.time.split(':');
            const dateTime = new Date(selectedDate);
            dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            await api.post('/appointments', {
                member_id: formData.member_id,
                dateTime,
                type: formData.type,
                notes: formData.notes
            });
            setShowModal(false);
            setFormData({ member_id: '', time: '08:00', type: 'TREINO', notes: '' });
            fetchAppointments();
        } catch (err) {
            alert('Erro ao criar agendamento');
        }
    };

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await api.put(`/appointments/${id}`, { status });
            fetchAppointments();
        } catch (err) {
            alert('Erro ao atualizar status');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este agendamento?')) return;
        try {
            await api.delete(`/appointments/${id}`);
            fetchAppointments();
        } catch (err) {
            alert('Erro ao excluir');
        }
    };

    const nextDay = () => {
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + 1);
        setSelectedDate(next);
    };

    const prevDay = () => {
        const prev = new Date(selectedDate);
        prev.setDate(prev.getDate() - 1);
        setSelectedDate(prev);
    };

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone.includes(searchTerm)
    );

    return (
        <div className="animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight flex items-center gap-3">
                        <CalendarIcon className="text-primary" size={32} />
                        Agenda
                    </h1>
                    <p className="text-slate-500 font-medium">Controle os horários e atendimentos da sua academia.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-primary text-white px-6 py-4 rounded-2xl font-black hover:opacity-90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 active:scale-95"
                >
                    <Plus size={20} />
                    NOVO AGENDAMENTO
                </button>
            </div>

            {/* Date Selector */}
            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 mb-8 flex items-center justify-between">
                <button onClick={prevDay} className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-primary transition-all">
                    <ChevronLeft size={24} />
                </button>
                <div className="text-center">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                        {format(selectedDate, 'eeee', { locale: ptBR })}
                    </p>
                    <h2 className="text-xl font-black text-slate-900">
                        {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                    </h2>
                </div>
                <button onClick={nextDay} className="p-3 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-primary transition-all">
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Appointments List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="bg-white rounded-[2rem] p-12 flex flex-col items-center justify-center border border-slate-100">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando agenda...</p>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="bg-white rounded-[3rem] p-16 text-center border border-slate-100">
                        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Clock className="text-slate-200" size={40} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">Sem horários para hoje</h3>
                        <p className="text-slate-500 mb-8 max-w-xs mx-auto">Aproveite para organizar a casa ou agendar novas avaliações.</p>
                        <button
                            onClick={() => setShowModal(true)}
                            className="text-primary font-black uppercase text-sm tracking-widest hover:underline"
                        >
                            + AGENDAR AGORA
                        </button>
                    </div>
                ) : (
                    appointments.map((app) => (
                        <div key={app.id} className="group bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all flex flex-col md:flex-row md:items-center gap-6 relative overflow-hidden">
                            <div className={clsx(
                                "absolute left-0 top-0 bottom-0 w-2",
                                app.status === 'CONFIRMED' ? 'bg-green-500' :
                                    app.status === 'CANCELLED' ? 'bg-red-500' : 'bg-amber-500'
                            )} />

                            <div className="flex items-center gap-4 min-w-[120px]">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-slate-900">
                                    <Clock size={16} className="text-primary mb-1" />
                                    <span className="font-black text-sm">{format(new Date(app.dateTime), 'HH:mm')}</span>
                                </div>
                                <div className="md:hidden flex-1">
                                    <h4 className="font-black text-lg text-slate-900 truncate">{app.member.name}</h4>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{app.type}</p>
                                </div>
                            </div>

                            <div className="hidden md:block flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-black text-xl text-slate-900 truncate">{app.member.name}</h4>
                                    <span className={clsx(
                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                        app.type === 'TREINO' ? 'bg-blue-50 text-blue-500' :
                                            app.type === 'AVALIAÇÃO' ? 'bg-purple-50 text-purple-500' : 'bg-orange-50 text-orange-500'
                                    )}>
                                        {app.type}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-slate-500 italic">
                                    {app.notes || "Sem observações adicionais"}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                {app.status === 'PENDING' && (
                                    <button
                                        onClick={() => handleStatusUpdate(app.id, 'CONFIRMED')}
                                        className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-500 hover:text-white transition-all shadow-sm"
                                        title="Confirmar"
                                    >
                                        <CheckCircle2 size={20} />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleStatusUpdate(app.id, app.status === 'CANCELLED' ? 'PENDING' : 'CANCELLED')}
                                    className={clsx(
                                        "p-3 rounded-xl transition-all shadow-sm",
                                        app.status === 'CANCELLED' ? "bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white" : "bg-red-50 text-red-600 hover:bg-red-500 hover:text-white"
                                    )}
                                    title={app.status === 'CANCELLED' ? "Reativar" : "Cancelar"}
                                >
                                    <XCircle size={20} />
                                </button>
                                <button
                                    onClick={() => handleDelete(app.id)}
                                    className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                    title="Excluir"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Novo Agendamento */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowModal(false)} />
                    <div className="bg-white w-full max-w-xl rounded-[3rem] p-8 md:p-12 shadow-2xl relative z-10 animate-fade-in-up">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Novo Agendamento</h3>
                                <p className="text-slate-500 font-medium">Reserve um horário para seu aluno.</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <XCircle size={24} className="text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Selecionar Aluno</label>
                                    <div className="relative mb-2">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Buscar por nome ou celular..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-primary transition-all"
                                        />
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                        {filteredMembers.map(m => (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, member_id: m.id });
                                                    setSearchTerm(m.name);
                                                }}
                                                className={clsx(
                                                    "w-full text-left p-4 rounded-2xl font-bold transition-all border-2",
                                                    formData.member_id === m.id ? "bg-primary/5 border-primary text-primary" : "bg-white border-slate-100 text-slate-600 hover:border-primary/30"
                                                )}
                                            >
                                                {m.name}
                                                <span className="block text-[10px] text-slate-400 mt-0.5">{m.phone}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Horário</label>
                                        <input
                                            type="time"
                                            value={formData.time}
                                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-primary transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Tipo</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-primary transition-all"
                                        >
                                            <option value="TREINO">TREINO</option>
                                            <option value="AVALIAÇÃO">AVALIAÇÃO</option>
                                            <option value="PERSONAL">PERSONAL</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">Observações (Opcional)</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 focus:ring-primary transition-all h-24 resize-none"
                                        placeholder="Alguma restrição ou lembrete..."
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!formData.member_id}
                                className="w-full bg-primary text-white py-5 rounded-[2rem] font-black shadow-xl shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50 active:scale-95"
                            >
                                CONFIRMAR AGENDAMENTO
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
