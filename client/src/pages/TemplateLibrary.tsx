import React, { useMemo, useState } from 'react';
import { BookOpen, Check, Copy, Download, Dumbbell, Filter, Salad, Search, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { allTemplates, templateToText, type LibraryTemplate, type TemplateType } from '../data/templateLibrary';
import { downloadTemplatePdf } from '../utils/templatePdf';
import { toast } from 'react-toastify';

export const TemplateLibrary: React.FC = () => {
    const [activeType, setActiveType] = useState<TemplateType>('workout');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState(allTemplates.find(template => template.type === 'workout')?.id || '');
    const [selectedVariation, setSelectedVariation] = useState(0);

    const filtered = useMemo(() => allTemplates.filter(template => {
        if (template.type !== activeType) return false;
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return [template.title, template.subtitle, template.goal, template.level, ...template.tags].join(' ').toLowerCase().includes(query);
    }), [activeType, search]);

    const selected = filtered.find(template => template.id === selectedId) || filtered[0];

    const changeType = (type: TemplateType) => {
        setActiveType(type);
        const first = allTemplates.find(template => template.type === type);
        setSelectedId(first?.id || '');
        setSelectedVariation(0);
        setSearch('');
    };

    const handleCopy = async () => {
        if (!selected) return;
        await navigator.clipboard.writeText(templateToText(selected, selectedVariation));
        toast.success('Modelo copiado para a área de transferência');
    };

    return (
        <div className="animate-fade-in-up pb-16">
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-2 text-primary mb-3">
                        <BookOpen size={18} />
                        <span className="text-[10px] font-black uppercase tracking-[0.25em]">Biblioteca profissional</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900">Modelos prontos para <span className="text-primary">aplicar</span></h1>
                    <p className="text-slate-500 font-medium mt-2 max-w-2xl">Treinos e estruturas alimentares reutilizáveis para a equipe ganhar tempo sem perder qualidade.</p>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-100 rounded-2xl shadow-sm w-fit">
                    <button type="button" onClick={() => changeType('workout')} className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all', activeType === 'workout' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50')}><Dumbbell size={15} /> Treinos</button>
                    <button type="button" onClick={() => changeType('diet')} className={clsx('flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all', activeType === 'diet' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-50')}><Salad size={15} /> Alimentação</button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,360px)_1fr] gap-6 items-start">
                <section className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
                    <div className="relative mb-4">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar objetivo, nível ou modelo" className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-medium" />
                    </div>
                    <div className="flex items-center justify-between mb-3 px-1"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{filtered.length} modelos disponíveis</span><Filter size={14} className="text-slate-300" /></div>
                    <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                        {filtered.map(template => (
                            <button type="button" key={template.id} onClick={() => { setSelectedId(template.id); setSelectedVariation(0); }} className={clsx('w-full text-left p-3 rounded-2xl border transition-all', selected?.id === template.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-100 hover:border-primary/30 hover:bg-slate-50')}>
                                <div className="flex items-start justify-between gap-2"><span className="text-sm font-black text-slate-900 leading-tight">{template.title}</span>{selected?.id === template.id && <Check size={15} className="text-primary shrink-0" />}</div>
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{template.subtitle}</p>
                                <div className="flex flex-wrap gap-1 mt-2"><span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 rounded-md px-2 py-1">{template.goal}</span><span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 rounded-md px-2 py-1">{template.level}</span></div>
                            </button>
                        ))}
                        {filtered.length === 0 && <div className="py-10 text-center text-sm text-slate-400">Nenhum modelo encontrado.</div>}
                    </div>
                </section>

                {selected ? (
                    <section className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                        <div className="bg-slate-900 text-white p-6 md:p-8 relative overflow-hidden">
                            <div className="absolute -right-10 -top-16 w-56 h-56 rounded-full bg-primary/20 blur-3xl" />
                            <div className="relative">
                                <div className="flex items-center gap-2 text-primary mb-3"><Sparkles size={16} /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Modelo pronto</span></div>
                                <h2 className="text-2xl md:text-3xl font-black tracking-tight">{selected.title}</h2>
                                <p className="text-white/60 mt-1">{selected.subtitle}</p>
                                <div className="flex flex-wrap gap-2 mt-5">{selected.tags.map(tag => <span key={tag} className="px-2.5 py-1.5 rounded-lg bg-white/10 text-[10px] font-black uppercase tracking-wider text-white/80">{tag}</span>)}</div>
                            </div>
                        </div>
                        <div className="p-6 md:p-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                {[
                                    ['Objetivo', selected.goal],
                                    ['Nível', selected.level],
                                    ['Estrutura', selected.frequency],
                                    [activeType === 'workout' ? 'Equipamento' : 'Formato', selected.equipment],
                                ].map(([label, value]) => <div key={label} className="p-3 rounded-xl bg-slate-50 border border-slate-100"><span className="block text-[9px] text-slate-400 uppercase tracking-widest font-black mb-1">{label}</span><span className="block text-xs text-slate-800 font-black line-clamp-2">{value}</span></div>)}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Escolha uma variação</h3><div className="flex gap-2 overflow-x-auto">{selected.variations.map((variation, index) => <button type="button" key={variation.name} onClick={() => setSelectedVariation(index)} className={clsx('shrink-0 px-3 py-2 rounded-xl text-[10px] font-black border transition-all', selectedVariation === index ? 'bg-primary text-white border-primary' : 'text-slate-500 border-slate-200 hover:border-primary/40')}>{variation.name}</button>)}</div></div>

                            <div className="space-y-3">
                                {activeType === 'workout' ? (
                                    (selected as Extract<LibraryTemplate, { type: 'workout' }>).variations[selectedVariation].days.map(day => <div key={day.name} className="rounded-2xl border border-slate-100 overflow-hidden"><div className="px-4 py-3 bg-slate-50 flex items-center justify-between"><span className="text-sm font-black text-slate-900">{day.name}</span><span className="text-[10px] font-black uppercase tracking-widest text-primary">{day.focus}</span></div><div className="divide-y divide-slate-100">{day.exercises.map(exercise => <div key={`${day.name}-${exercise.name}`} className="grid grid-cols-[1fr_auto_auto] gap-3 px-4 py-3 items-center"><span className="text-xs font-black text-slate-700">{exercise.name}</span><span className="text-[10px] font-black text-slate-400 whitespace-nowrap">{exercise.sets} séries</span><span className="text-[10px] font-black text-slate-400 whitespace-nowrap">{exercise.reps}</span></div>)}</div></div>)
                                ) : (
                                    (selected as Extract<LibraryTemplate, { type: 'diet' }>).variations[selectedVariation].meals.map(meal => <div key={meal.name} className="rounded-2xl border border-slate-100 p-4"><h4 className="text-sm font-black text-slate-900 mb-2">{meal.name}</h4><div className="grid sm:grid-cols-2 gap-2">{meal.options.map(option => <div key={option} className="text-xs font-medium text-slate-600 bg-slate-50 rounded-xl p-2.5">{option}</div>)}</div></div>)
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-slate-100">
                                <button type="button" onClick={() => downloadTemplatePdf(selected, selectedVariation)} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider hover:border-primary hover:text-primary transition-colors"><Download size={16} /> Baixar PDF</button>
                                <button type="button" onClick={handleCopy} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider hover:border-primary hover:text-primary transition-colors"><Copy size={16} /> Copiar modelo</button>
                            </div>
                            <div className="mt-5 p-4 rounded-2xl bg-orange-50 border border-orange-100 text-xs leading-relaxed text-orange-900"><strong className="font-black">Uso profissional:</strong> {selected.professionalNote}</div>
                        </div>
                    </section>
                ) : <section className="min-h-[400px] flex items-center justify-center bg-white border border-dashed border-slate-200 rounded-3xl text-sm text-slate-400">Selecione um modelo para visualizar.</section>}
            </div>
        </div>
    );
};
