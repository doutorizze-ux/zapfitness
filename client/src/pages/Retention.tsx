import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, MessageCircle, RefreshCw, Search, ShieldAlert, ShieldCheck, UserRound, WalletCards } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useTutorial } from '../contexts/TutorialContext';
import api from '../api';

interface RetentionPlan {
    name?: string;
    price?: number;
}

interface RetentionMember {
    id: string;
    name: string;
    phone: string;
    active?: boolean;
    plan_end_date?: string | null;
    bot_paused?: boolean;
    plan?: RetentionPlan | null;
}

interface AccessLog {
    member_id?: string;
    status?: string;
    scanned_at?: string;
}

type RetentionFilter = 'all' | 'critical' | 'renewal' | 'inactive';
type RiskLevel = 'critical' | 'attention' | 'healthy';

interface RetentionRow extends RetentionMember {
    daysUntilExpiry: number | null;
    daysSinceAccess: number | null;
    riskScore: number;
    level: RiskLevel;
    reasons: string[];
    lastAccess: string | null;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
}).format(Number(value) || 0);

const formatDate = (value: string | null) => value
    ? new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
    : 'Sem registro';

const formatDaysUntil = (days: number | null) => {
    if (days === null) return 'Sem validade';
    if (days < 0) return `Vencido há ${Math.abs(days)} ${Math.abs(days) === 1 ? 'dia' : 'dias'}`;
    if (days === 0) return 'Vence hoje';
    return `Vence em ${days} ${days === 1 ? 'dia' : 'dias'}`;
};

const buildRetentionRow = (member: RetentionMember, lastAccess: string | null, now: Date): RetentionRow => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const planEnd = member.plan_end_date ? new Date(member.plan_end_date) : null;
    const daysUntilExpiry = planEnd && !Number.isNaN(planEnd.getTime())
        ? Math.ceil((new Date(planEnd.getFullYear(), planEnd.getMonth(), planEnd.getDate()).getTime() - today.getTime()) / DAY_IN_MS)
        : null;
    const accessDate = lastAccess ? new Date(lastAccess) : null;
    const daysSinceAccess = accessDate && !Number.isNaN(accessDate.getTime())
        ? Math.max(0, Math.floor((today.getTime() - new Date(accessDate.getFullYear(), accessDate.getMonth(), accessDate.getDate()).getTime()) / DAY_IN_MS))
        : null;

    let riskScore = 0;
    const reasons: string[] = [];

    if (!member.active) {
        riskScore += 45;
        reasons.push('Cadastro inativo');
    }

    if (daysUntilExpiry === null) {
        riskScore += 20;
        reasons.push('Plano sem validade');
    } else if (daysUntilExpiry < 0) {
        riskScore += 50;
        reasons.push('Plano vencido');
    } else if (daysUntilExpiry <= 7) {
        riskScore += 30;
        reasons.push('Renovação próxima');
    } else if (daysUntilExpiry <= 30) {
        riskScore += 10;
        reasons.push('Renovação no radar');
    }

    if (daysSinceAccess === null) {
        riskScore += 30;
        reasons.push('Sem acessos registrados');
    } else if (daysSinceAccess >= 14) {
        riskScore += 35;
        reasons.push(`${daysSinceAccess} dias sem treinar`);
    } else if (daysSinceAccess >= 7) {
        riskScore += 22;
        reasons.push(`${daysSinceAccess} dias sem treinar`);
    }

    if (member.bot_paused) {
        riskScore += 10;
        reasons.push('Automação pausada');
    }

    const level: RiskLevel = riskScore >= 70 ? 'critical' : riskScore >= 40 ? 'attention' : 'healthy';

    return {
        ...member,
        daysUntilExpiry,
        daysSinceAccess,
        riskScore: Math.min(100, riskScore),
        level,
        reasons: reasons.slice(0, 3),
        lastAccess
    };
};

export const Retention = () => {
    const navigate = useNavigate();
    const { startTutorial, hasSeenTutorial } = useTutorial();
    const [members, setMembers] = useState<RetentionRow[]>([]);
    const [filter, setFilter] = useState<RetentionFilter>('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchRetention = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [membersResponse, logsResponse] = await Promise.all([api.get('/members'), api.get('/logs')]);
            const rawMembers: RetentionMember[] = Array.isArray(membersResponse.data) ? membersResponse.data : [];
            const logs: AccessLog[] = Array.isArray(logsResponse.data) ? logsResponse.data : [];
            const lastAccessByMember = new Map<string, string>();

            logs.filter(log => log.status === 'GRANTED' && log.member_id && log.scanned_at).forEach(log => {
                const memberId = log.member_id as string;
                const current = lastAccessByMember.get(memberId);
                if (!current || new Date(log.scanned_at as string) > new Date(current)) {
                    lastAccessByMember.set(memberId, log.scanned_at as string);
                }
            });

            setMembers(rawMembers
                .map(member => buildRetentionRow(member, lastAccessByMember.get(member.id) || null, new Date()))
                .sort((a, b) => b.riskScore - a.riskScore));
        } catch (error) {
            console.error('Erro ao carregar central de retenção:', error);
            toast.error('Não foi possível carregar o radar de retenção.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        requestAnimationFrame(() => {
            if (!hasSeenTutorial('retention')) startTutorial('retention');
            fetchRetention();
        });
    }, [fetchRetention, hasSeenTutorial, startTutorial]);

    const filteredMembers = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        return members.filter(member => {
            const matchesSearch = !normalizedSearch || member.name.toLowerCase().includes(normalizedSearch) || member.phone.includes(normalizedSearch);
            const matchesFilter = filter === 'all'
                || (filter === 'critical' && member.level === 'critical')
                || (filter === 'renewal' && member.daysUntilExpiry !== null && member.daysUntilExpiry <= 7)
                || (filter === 'inactive' && (member.daysSinceAccess === null || member.daysSinceAccess >= 7));
            return matchesSearch && matchesFilter;
        });
    }, [filter, members, search]);

    const metrics = useMemo(() => ({
        critical: members.filter(member => member.level === 'critical').length,
        renewals: members.filter(member => member.daysUntilExpiry !== null && member.daysUntilExpiry >= 0 && member.daysUntilExpiry <= 7).length,
        engaged: members.filter(member => member.level === 'healthy').length,
        revenueAtRisk: members
            .filter(member => member.level !== 'healthy')
            .reduce((total, member) => total + (Number(member.plan?.price) || 0), 0)
    }), [members]);

    const sendRecoveryMessage = async (member: RetentionRow) => {
        const cleanPhone = member.phone.replace(/\D/g, '');
        if (!cleanPhone) {
            toast.error('Este aluno não possui um telefone válido.');
            return;
        }

        const message = member.daysUntilExpiry !== null && member.daysUntilExpiry <= 7
            ? `Olá, ${member.name}! 👋\n\nPassando para avisar que seu plano ${member.daysUntilExpiry < 0 ? 'venceu' : member.daysUntilExpiry === 0 ? 'vence hoje' : `vence em ${member.daysUntilExpiry} dias`}. Queremos te ajudar a renovar e continuar evoluindo com a gente. Fale com a recepção e vamos cuidar disso juntos! 💪`
            : `Olá, ${member.name}! 👋\n\nSentimos sua falta na academia. Está tudo bem? Se precisar ajustar seu treino ou retomar sua rotina, estamos aqui para te ajudar. Bora voltar? 💪`;

        try {
            await api.post('/chat/send', { jid: `${cleanPhone}@s.whatsapp.net`, text: message });
            toast.success(`Mensagem preparada para ${member.name}.`);
        } catch (error) {
            console.error('Erro ao enviar mensagem de retenção:', error);
            toast.error('Conecte o WhatsApp da academia para enviar mensagens.');
        }
    };

    const riskTone = (level: RiskLevel) => level === 'critical'
        ? { label: 'Crítico', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', bar: 'bg-red-500' }
        : level === 'attention'
            ? { label: 'Atenção', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', bar: 'bg-amber-500' }
            : { label: 'Saudável', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', bar: 'bg-emerald-500' };

    const filterOptions: { id: RetentionFilter; label: string; count: number }[] = [
        { id: 'all', label: 'Todos', count: members.length },
        { id: 'critical', label: 'Prioridade alta', count: metrics.critical },
        { id: 'renewal', label: 'Renovam em 7 dias', count: metrics.renewals },
        { id: 'inactive', label: 'Sem frequência', count: members.filter(member => member.daysSinceAccess === null || member.daysSinceAccess >= 7).length }
    ];

    return (
        <div className="animate-fade-in-up pb-12">
            <div id="retention-header" className="mb-8 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-primary">
                        <ShieldCheck size={16} /> Inteligência de retenção
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 md:text-5xl">Proteja sua <span className="text-primary">base ativa</span></h1>
                    <p className="mt-3 max-w-2xl font-medium leading-relaxed text-slate-500">Veja quem precisa de atenção antes de cancelar, renove no momento certo e transforme relacionamento em permanência.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="button" onClick={() => fetchRetention(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm transition hover:border-primary/30 hover:text-primary">
                        <RefreshCw size={16} className={clsx(refreshing && 'animate-spin')} /> Atualizar radar
                    </button>
                    <button type="button" onClick={() => navigate('/dashboard/members')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 transition hover:scale-[1.02] active:scale-95">
                        Ver membros <ArrowUpRight size={16} />
                    </button>
                </div>
            </div>

            <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
                <div className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-4 flex items-center justify-between"><span className="rounded-xl bg-red-50 p-2.5 text-red-500"><ShieldAlert size={18} /></span><span className="text-[9px] font-black uppercase tracking-widest text-red-500">Prioridade</span></div>
                    <div className="text-3xl font-black tracking-tight text-slate-900">{loading ? '—' : metrics.critical}</div>
                    <div className="mt-1 text-xs font-bold text-slate-400">alunos em risco crítico</div>
                </div>
                <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-4 flex items-center justify-between"><span className="rounded-xl bg-amber-50 p-2.5 text-amber-500"><Clock3 size={18} /></span><span className="text-[9px] font-black uppercase tracking-widest text-amber-500">Receita</span></div>
                    <div className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">{loading ? '—' : formatCurrency(metrics.revenueAtRisk)}</div>
                    <div className="mt-1 text-xs font-bold text-slate-400">em planos sob atenção</div>
                </div>
                <div className="rounded-3xl border border-primary/10 bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-4 flex items-center justify-between"><span className="rounded-xl bg-primary/10 p-2.5 text-primary"><WalletCards size={18} /></span><span className="text-[9px] font-black uppercase tracking-widest text-primary">Próximos 7 dias</span></div>
                    <div className="text-3xl font-black tracking-tight text-slate-900">{loading ? '—' : metrics.renewals}</div>
                    <div className="mt-1 text-xs font-bold text-slate-400">renovações para antecipar</div>
                </div>
                <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm md:p-6">
                    <div className="mb-4 flex items-center justify-between"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-500"><CheckCircle2 size={18} /></span><span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Base saudável</span></div>
                    <div className="text-3xl font-black tracking-tight text-slate-900">{loading ? '—' : metrics.engaged}</div>
                    <div className="mt-1 text-xs font-bold text-slate-400">alunos sem alerta relevante</div>
                </div>
            </div>

            <div className="mb-8 overflow-hidden rounded-[2.5rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/10 md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-primary">Próximo movimento recomendado</div>
                        <h2 className="text-2xl font-black tracking-tight md:text-3xl">Comece pelos alunos com dois sinais de risco.</h2>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">A prioridade combina validade do plano, frequência e status da automação para sua equipe agir com contexto, não no escuro.</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <AlertTriangle className="text-amber-400" size={20} />
                        <div><div className="text-xl font-black">{metrics.critical}</div><div className="text-[9px] font-black uppercase tracking-widest text-slate-500">ações prioritárias</div></div>
                    </div>
                </div>
            </div>

            <div id="retention-filters" className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {filterOptions.map(option => (
                        <button key={option.id} type="button" onClick={() => setFilter(option.id)} className={clsx('shrink-0 rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all', filter === option.id ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20' : 'border-slate-200 bg-white text-slate-500 hover:border-primary/30 hover:text-primary')}>
                            {option.label} <span className={clsx('ml-1 rounded-lg px-1.5 py-0.5', filter === option.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400')}>{option.count}</span>
                        </button>
                    ))}
                </div>
                <div className="group relative w-full xl:max-w-sm">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary" size={17} />
                    <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar aluno ou telefone..." className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-5 text-sm font-medium text-slate-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" />
                </div>
            </div>

            <div id="retention-list" className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 md:px-8">
                    <div><h3 className="text-lg font-black tracking-tight text-slate-900">Fila de relacionamento</h3><p className="mt-1 text-xs font-medium text-slate-400">Ações ordenadas pelo nível de risco calculado.</p></div>
                    <div className="hidden items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 sm:flex"><UserRound size={14} /> {filteredMembers.length} exibidos</div>
                </div>
                {loading ? (
                    <div className="p-16 text-center text-xs font-black uppercase tracking-widest text-slate-400">Calculando sinais da base...</div>
                ) : filteredMembers.length === 0 ? (
                    <div className="p-16 text-center"><CheckCircle2 className="mx-auto mb-4 text-emerald-400" size={38} /><h3 className="font-black text-slate-900">Nenhum aluno nesta visão</h3><p className="mt-2 text-sm font-medium text-slate-400">Ajuste o filtro ou a busca para explorar outros alunos.</p></div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredMembers.map(member => {
                            const tone = riskTone(member.level);
                            return (
                                <div key={member.id} className="p-5 transition-colors hover:bg-slate-50/60 md:p-7">
                                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                                        <div className="flex min-w-0 flex-1 items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-black text-white shadow-lg">{member.name?.charAt(0)?.toUpperCase() || 'A'}</div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-2"><h4 className="truncate text-base font-black text-slate-900">{member.name}</h4><span className={clsx('rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-widest', tone.bg, tone.text, tone.border)}>{tone.label}</span></div>
                                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-slate-400"><span>{member.plan?.name || 'Plano manual'}</span><span>•</span><span>{member.phone}</span></div>
                                                <div className="mt-3 flex flex-wrap gap-2">{member.reasons.map(reason => <span key={reason} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-slate-500">{reason}</span>)}</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3 sm:border-t-0 sm:pt-0 xl:w-[390px]">
                                            <div><div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Frequência</div><div className="mt-1 text-sm font-black text-slate-700">{member.daysSinceAccess === null ? 'Sem registro' : member.daysSinceAccess === 0 ? 'Hoje' : `${member.daysSinceAccess}d atrás`}</div><div className="mt-0.5 text-[10px] font-bold text-slate-400">{formatDate(member.lastAccess)}</div></div>
                                            <div><div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Plano</div><div className={clsx('mt-1 text-sm font-black', member.daysUntilExpiry !== null && member.daysUntilExpiry <= 7 ? 'text-amber-600' : 'text-slate-700')}>{formatDaysUntil(member.daysUntilExpiry)}</div><div className="mt-0.5 text-[10px] font-bold text-slate-400">{member.plan?.price ? formatCurrency(Number(member.plan.price)) : 'Valor não informado'}</div></div>
                                            <div className="col-span-2 sm:col-span-1"><div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400"><span>Risco</span><span>{member.riskScore}/100</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={clsx('h-full rounded-full transition-all', tone.bar)} style={{ width: `${Math.max(8, member.riskScore)}%` }} /></div></div>
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                            <button type="button" onClick={() => sendRecoveryMessage(member)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 transition hover:bg-emerald-500 hover:text-white sm:flex-none" title="Enviar mensagem de recuperação"><MessageCircle size={16} /> <span className="sm:hidden xl:inline">Contato</span></button>
                                            <button type="button" onClick={() => navigate('/dashboard/members')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition hover:border-primary/30 hover:text-primary"><ArrowUpRight size={16} /> <span className="sm:hidden xl:inline">Perfil</span></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
