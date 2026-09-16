import { useEffect, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import {
    Apple,
    ArrowUpRight,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Dumbbell,
    FileText,
    Flame,
    HeartPulse,
    Leaf,
    PlayCircle,
    ShieldCheck,
    Sparkles,
    Trophy,
    UserRound,
    Utensils
} from 'lucide-react';
import { motion } from 'framer-motion';

interface PublicPlan {
    name: string;
    price: number;
    duration_days: number;
}

interface PublicMember {
    name: string;
    diet_plan: string | null;
    plan_start_date: string | null;
    plan_end_date: string | null;
    active: boolean;
    plan: PublicPlan | null;
    tenant: {
        name: string;
        primary_color: string;
        logo_url: string | null;
    };
}

interface PublicWorkoutData {
    id: string;
    name: string;
    notes: string | null;
    exercises: {
        id: string;
        sets: number | null;
        reps: string | null;
        weight: string | null;
        rest_time: string | null;
        exercise: {
            name: string;
            description: string | null;
            category: string | null;
            video_url: string | null;
        };
    }[];
    member: PublicMember;
}

type PublicView = 'workout' | 'diet';

interface DietSection {
    title: string;
    lines: string[];
}

const hexToRgb = (hex: string) => {
    const normalized = hex.replace('#', '').trim();
    const value = normalized.length === 3
        ? normalized.split('').map(char => `${char}${char}`).join('')
        : normalized;

    if (!/^[0-9a-f]{6}$/i.test(value)) return '249 115 22';

    return `${parseInt(value.slice(0, 2), 16)} ${parseInt(value.slice(2, 4), 16)} ${parseInt(value.slice(4, 6), 16)}`;
};

const formatDate = (date: string | null | undefined) => {
    if (!date) return null;

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short'
    }).format(new Date(date)).replace('.', '');
};

const splitDietPlan = (plan: string): DietSection[] => {
    const blocks = plan
        .trim()
        .split(/\n\s*\n/)
        .map(block => block.split('\n').map(line => line.trim()).filter(Boolean))
        .filter(block => block.length > 0);

    return blocks.map((lines, index) => {
        const firstLine = lines[0];
        const looksLikeTitle = lines.length > 1 && (
            firstLine.endsWith(':')
            || firstLine === firstLine.toUpperCase()
            || /^[🥗🍳🍎🥣🍌🍽️]/u.test(firstLine)
        );

        return {
            title: looksLikeTitle ? firstLine.replace(/:$/, '') : `Orientação ${String(index + 1).padStart(2, '0')}`,
            lines: looksLikeTitle ? lines.slice(1) : lines
        };
    });
};

const getInitialView = (hasWorkout: boolean, hasDiet: boolean): PublicView => {
    if (!hasWorkout && hasDiet) return 'diet';
    return 'workout';
};

export const PublicWorkout = () => {
    const { id } = useParams();
    const [workouts, setWorkouts] = useState<PublicWorkoutData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeView, setActiveView] = useState<PublicView>('workout');

    useEffect(() => {
        const fetchWorkout = async () => {
            try {
                const res = await api.get(`/public/workouts/${id}`);
                const data: PublicWorkoutData[] = Array.isArray(res.data) ? res.data : [];
                setWorkouts(data);

                if (data.length > 0) {
                    const hasDiet = Boolean(data[0].member.diet_plan?.trim());
                    const hasWorkout = data.some(workout => workout.exercises.length > 0 || Boolean(workout.notes?.trim()));
                    setActiveView(getInitialView(hasWorkout, hasDiet));
                }
            } catch (err) {
                console.error('Error fetching public member plan:', err);
                setError('Ficha não encontrada ou indisponível no momento.');
            } finally {
                setLoading(false);
            }
        };

        fetchWorkout();
    }, [id]);

    if (loading) return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-primary/15 text-primary shadow-2xl shadow-primary/20">
                <Dumbbell size={30} />
            </div>
            <h2 className="text-lg font-black uppercase tracking-[0.18em]">Abrindo seu espaço</h2>
            <p className="mt-2 text-sm font-medium text-slate-400">Treino e alimentação a um toque de distância.</p>
        </div>
    );

    if (error || workouts.length === 0) return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-red-500/15 text-red-400">
                <Dumbbell size={38} />
            </div>
            <p className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-primary">Área do aluno</p>
            <h2 className="text-2xl font-black tracking-tight">Não conseguimos abrir sua ficha</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">{error || 'Nenhum treino ou plano alimentar ativo foi publicado para este link.'}</p>
        </div>
    );

    const firstWorkout = workouts[0];
    const member = firstWorkout.member;
    const tenant = member.tenant;
    const primaryColor = tenant.primary_color || '#f97316';
    const hasDiet = Boolean(member.diet_plan?.trim());
    const hasWorkout = workouts.some(workout => workout.exercises.length > 0 || Boolean(workout.notes?.trim()));
    const totalExercises = workouts.reduce((total, workout) => total + workout.exercises.length, 0);
    const dietSections = hasDiet ? splitDietPlan(member.diet_plan || '') : [];
    const planEndDate = formatDate(member.plan_end_date);
    const isPlanActive = member.active && (!member.plan_end_date || new Date(member.plan_end_date) >= new Date());
    const pageStyle = {
        '--primary-color': primaryColor,
        '--primary-rgb': hexToRgb(primaryColor)
    } as CSSProperties;

    return (
        <div style={pageStyle} className="min-h-[100dvh] overflow-x-hidden bg-[#f5f7fa] text-slate-900">
            <header className="relative overflow-hidden bg-slate-950 text-white">
                <div className="pointer-events-none absolute -right-20 -top-36 h-80 w-80 rounded-full bg-primary/25 blur-[100px]" />
                <div className="pointer-events-none absolute -bottom-40 -left-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-[100px]" />

                <div className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-7 sm:px-8 sm:pb-28 sm:pt-10">
                    <div className="flex items-center justify-between gap-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
                            <Sparkles size={13} className="text-primary" /> Portal do aluno
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" /> Ficha ativa
                        </div>
                    </div>

                    <div className="mt-10 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                        {tenant.logo_url ? (
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] bg-white p-3 shadow-2xl shadow-black/20 ring-1 ring-white/20 sm:h-24 sm:w-24">
                                <img src={tenant.logo_url} alt={tenant.name} className="h-full w-full object-contain" />
                            </div>
                        ) : (
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] bg-primary text-2xl font-black text-white shadow-2xl shadow-primary/30 sm:h-24 sm:w-24">
                                {tenant.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-primary">Seu espaço de evolução</p>
                            <h1 className="max-w-3xl text-3xl font-black tracking-[-0.04em] sm:text-5xl">{tenant.name}</h1>
                            <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base">Treino, alimentação e próximos passos organizados para você evoluir com clareza.</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 mx-auto -mt-14 max-w-6xl px-4 pb-12 sm:px-6 lg:pb-16">
                <section className="overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_24px_70px_-42px_rgba(15,23,42,0.48)] sm:rounded-[2.5rem]">
                    <div className="flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-slate-950 text-primary shadow-xl shadow-slate-950/15 sm:h-20 sm:w-20">
                                <UserRound size={30} />
                            </div>
                            <div className="min-w-0">
                                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.24em] text-primary">Plano personalizado</p>
                                <h2 className="truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Olá, {member.name.split(' ')[0]}!</h2>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                                    <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} className={isPlanActive ? 'text-emerald-500' : 'text-amber-500'} /> {isPlanActive ? 'Acompanhamento ativo' : 'Confirme seu plano na recepção'}</span>
                                    {planEndDate && <><span className="text-slate-200">•</span><span>Até {planEndDate}</span></>}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:min-w-[360px] sm:gap-3">
                            <div className="rounded-2xl bg-slate-50 p-3 sm:p-4">
                                <div className="flex items-center gap-1.5 text-primary"><Dumbbell size={15} /><span className="text-[9px] font-black uppercase tracking-widest">Fichas</span></div>
                                <p className="mt-2 text-xl font-black text-slate-950">{workouts.length}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3 sm:p-4">
                                <div className="flex items-center gap-1.5 text-cyan-600"><Flame size={15} /><span className="text-[9px] font-black uppercase tracking-widest">Exercícios</span></div>
                                <p className="mt-2 text-xl font-black text-slate-950">{totalExercises}</p>
                            </div>
                            <div className="rounded-2xl bg-slate-50 p-3 sm:p-4">
                                <div className="flex items-center gap-1.5 text-emerald-600"><Apple size={15} /><span className="text-[9px] font-black uppercase tracking-widest">Alimentação</span></div>
                                <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-950">{hasDiet ? 'Pronta' : 'Pendente'}</p>
                            </div>
                        </div>
                    </div>

                    {(hasWorkout || hasDiet) && (
                        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-8 sm:py-4">
                            <div role="tablist" aria-label="Conteúdo da ficha" className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-200/60 p-1.5 sm:inline-flex sm:min-w-[390px]">
                                {hasWorkout && (
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={activeView === 'workout'}
                                        onClick={() => setActiveView('workout')}
                                        className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black uppercase tracking-widest transition-all ${activeView === 'workout' ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/15' : 'text-slate-500 hover:bg-white/70'}`}
                                    >
                                        <Dumbbell size={16} /> Treino
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeView === 'workout' ? 'bg-white/10 text-white/80' : 'bg-white text-slate-400'}`}>{workouts.length}</span>
                                    </button>
                                )}
                                {hasDiet && (
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={activeView === 'diet'}
                                        onClick={() => setActiveView('diet')}
                                        className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black uppercase tracking-widest transition-all ${activeView === 'diet' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-slate-500 hover:bg-white/70'}`}
                                    >
                                        <Apple size={16} /> Alimentação
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${activeView === 'diet' ? 'bg-white/15 text-white/80' : 'bg-white text-slate-400'}`}>1</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                {activeView === 'workout' && hasWorkout && (
                    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-5 sm:mt-8">
                        <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary"><HeartPulse size={15} /> Sua rotina</div>
                                <h3 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Treino com propósito</h3>
                                <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">Confira cada movimento, ajuste seu ritmo e mantenha a consistência ao longo da semana.</p>
                            </div>
                            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500"><ShieldCheck size={14} className="text-emerald-500" /> Acompanhamento digital</div>
                        </div>

                        {workouts.map((workout, workoutIndex) => (
                            <motion.article
                                key={workout.id}
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: workoutIndex * 0.06 }}
                                className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_-42px_rgba(15,23,42,0.5)]"
                            >
                                <div className="relative overflow-hidden bg-slate-950 px-5 py-6 text-white sm:px-7">
                                    <div className="pointer-events-none absolute -right-8 -top-14 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
                                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-primary"><Trophy size={14} /> Ficha {String(workoutIndex + 1).padStart(2, '0')}</div>
                                            <h4 className="text-2xl font-black tracking-tight sm:text-3xl">{workout.name}</h4>
                                        </div>
                                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/65"><Clock3 size={14} /> {workout.exercises.length} movimentos</div>
                                    </div>
                                </div>

                                <div className="space-y-4 p-4 sm:p-7">
                                    {workout.notes && (
                                        <div className="flex gap-3 rounded-2xl border border-orange-100 bg-orange-50/80 p-4 text-sm font-medium leading-relaxed text-orange-950">
                                            <FileText size={18} className="mt-0.5 shrink-0 text-primary" />
                                            <p className="whitespace-pre-wrap">{workout.notes}</p>
                                        </div>
                                    )}

                                    {workout.exercises.length > 0 ? (
                                        <div className="space-y-3">
                                            {workout.exercises.map((item, index) => (
                                                <div key={item.id} className="rounded-[1.5rem] border border-slate-100 bg-white p-4 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-slate-900/5 sm:p-5">
                                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-950/15">{String(index + 1).padStart(2, '0')}</div>
                                                            <div className="min-w-0">
                                                                <h5 className="text-base font-black leading-tight text-slate-950 sm:text-lg">{item.exercise.name}</h5>
                                                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">{item.exercise.category || 'Movimento'}</p>
                                                            </div>
                                                        </div>
                                                        {item.exercise.video_url && (
                                                            <a
                                                                href={item.exercise.video_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 sm:w-auto"
                                                            >
                                                                <PlayCircle size={17} fill="currentColor" /> Ver demonstração <ArrowUpRight size={14} />
                                                            </a>
                                                        )}
                                                    </div>

                                                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-2 sm:grid-cols-4 sm:p-3">
                                                        {[
                                                            ['Séries', item.sets || '-'],
                                                            ['Repetições', item.reps || '-'],
                                                            ['Carga', item.weight || '-'],
                                                            ['Descanso', item.rest_time || '-']
                                                        ].map(([label, value], metricIndex) => (
                                                            <div key={label} className={`px-2 py-2 text-center ${metricIndex > 0 ? 'border-l border-slate-200' : ''} ${metricIndex === 2 ? 'max-sm:border-l-0' : ''}`}>
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                                                                <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {item.exercise.description && <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium leading-relaxed text-slate-500">{item.exercise.description}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm font-medium text-slate-500">Esta ficha foi publicada com orientações manuais acima.</div>
                                    )}
                                </div>
                            </motion.article>
                        ))}
                    </motion.section>
                )}

                {activeView === 'diet' && hasDiet && (
                    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-5 sm:mt-8">
                        <div className="relative overflow-hidden rounded-[2rem] bg-emerald-950 px-5 py-7 text-white shadow-[0_24px_60px_-38px_rgba(6,78,59,0.65)] sm:px-8 sm:py-9">
                            <div className="pointer-events-none absolute -right-8 -top-20 h-56 w-56 rounded-full bg-emerald-400/15 blur-[70px]" />
                            <div className="relative max-w-2xl">
                                <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300"><Leaf size={15} /> Plano alimentar</div>
                                <h3 className="text-2xl font-black tracking-tight sm:text-3xl">Alimentação que acompanha sua evolução</h3>
                                <p className="mt-3 text-sm font-medium leading-relaxed text-emerald-100/70">Consulte aqui as orientações preparadas para sua rotina. Use este plano como seu ponto de referência ao longo do dia.</p>
                            </div>
                            <div className="relative mt-6 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-100/80">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2"><Apple size={14} /> Plano publicado</span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-2"><HeartPulse size={14} /> Feito para você</span>
                            </div>
                        </div>

                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                            <div className="rounded-[2rem] border border-slate-200/80 bg-white p-4 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.45)] sm:p-7">
                                <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-5">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Sua orientação</p>
                                        <h4 className="mt-1 text-xl font-black tracking-tight text-slate-950">Plano alimentar personalizado</h4>
                                    </div>
                                    <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 sm:flex"><Utensils size={20} /></div>
                                </div>

                                <div className="space-y-3">
                                    {dietSections.map((section, index) => (
                                        <div key={`${section.title}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                                            <div className="flex items-start gap-3">
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[10px] font-black text-primary shadow-sm">{String(index + 1).padStart(2, '0')}</span>
                                                <h5 className="pt-1 text-sm font-black leading-tight text-slate-950">{section.title}</h5>
                                            </div>
                                            <div className="mt-3 space-y-2 pl-11">
                                                {section.lines.map((line, lineIndex) => (
                                                    <div key={`${line}-${lineIndex}`} className="flex items-start gap-2 text-sm font-medium leading-relaxed text-slate-600">
                                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                                        <span className="whitespace-pre-wrap">{line.replace(/^[-•]\s*/, '')}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <aside className="space-y-4">
                                <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5 sm:p-6">
                                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm"><ShieldCheck size={20} /></div>
                                    <h4 className="text-base font-black text-emerald-950">Acompanhamento profissional</h4>
                                    <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-900/65">Siga as orientações do profissional responsável e converse com a academia se precisar ajustar sua rotina.</p>
                                </div>
                                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 sm:p-6">
                                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-primary shadow-sm"><CalendarDays size={20} /></div>
                                    <h4 className="text-base font-black text-slate-950">Consistência no dia a dia</h4>
                                    <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">Deixe este link salvo no WhatsApp para consultar suas orientações sempre que precisar.</p>
                                </div>
                                <p className="px-2 text-[10px] font-medium leading-relaxed text-slate-400">Este material é uma orientação individual da sua academia. Em caso de dúvidas clínicas, procure o nutricionista responsável.</p>
                            </aside>
                        </div>
                    </motion.section>
                )}

                {!hasWorkout && !hasDiet && (
                    <div className="mt-8 rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center">
                        <Dumbbell size={28} className="mx-auto text-slate-300" />
                        <h3 className="mt-4 text-lg font-black text-slate-950">Sua ficha está sendo preparada</h3>
                        <p className="mx-auto mt-2 max-w-sm text-sm font-medium leading-relaxed text-slate-500">Assim que a academia publicar seu treino ou plano alimentar, ele aparecerá aqui.</p>
                    </div>
                )}
            </main>

            <footer className="px-5 pb-10 text-center sm:pb-12">
                <div className="mx-auto flex w-fit items-center gap-2 text-slate-400"><Dumbbell size={15} /><span className="text-[10px] font-black uppercase tracking-[0.24em]">{tenant.name} • ZapFitness</span></div>
                <p className="mt-2 text-[10px] font-medium text-slate-400">Acesso individual e seguro para acompanhar sua evolução.</p>
            </footer>
        </div>
    );
};
