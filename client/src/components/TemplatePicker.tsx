import React, { useMemo, useState } from 'react';
import { BookOpen, Check, Download, Search, Sparkles, X } from 'lucide-react';
import clsx from 'clsx';
import { allTemplates, templateToText, type LibraryTemplate, type TemplateType } from '../data/templateLibrary';
import { downloadTemplatePdf } from '../utils/templatePdf';

interface TemplatePickerProps {
    type: TemplateType;
    onSelect: (template: LibraryTemplate, variationIndex: number) => void;
    onClose: () => void;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({ type, onSelect, onClose }) => {
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedVariation, setSelectedVariation] = useState(0);

    const templates = useMemo(() => allTemplates.filter(template => {
        if (template.type !== type) return false;
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return [template.title, template.subtitle, template.goal, template.level, ...template.tags]
            .join(' ')
            .toLowerCase()
            .includes(query);
    }), [search, type]);

    const selectedTemplate = templates.find(template => template.id === selectedId) || templates[0];
    const kindLabel = type === 'workout' ? 'treinos' : 'planos alimentares';

    const selectTemplate = (template: LibraryTemplate) => {
        setSelectedId(template.id);
        setSelectedVariation(0);
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-sm p-0 md:p-6 flex items-end md:items-center justify-center">
            <div className="bg-slate-50 w-full max-w-6xl h-[94dvh] md:h-[88vh] rounded-t-[2rem] md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
                <header className="bg-white border-b border-slate-100 px-5 py-4 md:px-8 md:py-5 flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <BookOpen size={22} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg md:text-xl font-black text-slate-900 truncate">Biblioteca de {kindLabel}</h2>
                            <p className="text-xs font-medium text-slate-400">Escolha um modelo pronto e aplique na ficha em segundos.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors" aria-label="Fechar biblioteca">
                        <X size={22} />
                    </button>
                </header>

                <div className="flex-1 min-h-0 flex flex-col md:flex-row">
                    <aside className="w-full md:w-[330px] shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-100 p-4 md:p-5 flex flex-col min-h-0">
                        <div className="relative mb-4">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                            <input
                                value={search}
                                onChange={event => setSearch(event.target.value)}
                                placeholder="Buscar modelo..."
                                className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 text-sm font-medium"
                            />
                        </div>
                        <div className="hidden md:flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelos prontos</span>
                            <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-full">{templates.length}</span>
                        </div>
                        <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pb-1 md:pb-0 no-scrollbar">
                            {templates.map(template => (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => selectTemplate(template)}
                                    className={clsx(
                                        'text-left min-w-[240px] md:min-w-0 p-3 rounded-xl border transition-all',
                                        selectedTemplate?.id === template.id
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-slate-100 bg-white hover:border-primary/30 hover:bg-slate-50'
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-sm font-black text-slate-900 leading-tight">{template.title}</span>
                                        {selectedTemplate?.id === template.id && <Check size={16} className="text-primary shrink-0" />}
                                    </div>
                                    <span className="mt-1 block text-[11px] text-slate-500 line-clamp-1">{template.subtitle}</span>
                                    <div className="mt-2 flex gap-1.5 flex-wrap">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md">{template.goal}</span>
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded-md">{template.level}</span>
                                    </div>
                                </button>
                            ))}
                            {templates.length === 0 && <p className="text-sm text-slate-400 py-5 text-center">Nenhum modelo encontrado.</p>}
                        </div>
                    </aside>

                    <section className="flex-1 min-w-0 min-h-0 overflow-y-auto p-5 md:p-8">
                        {selectedTemplate ? (
                            <>
                                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Modelo ZapFitness</span>
                                            <Sparkles size={14} className="text-primary" />
                                        </div>
                                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{selectedTemplate.title}</h3>
                                        <p className="text-slate-500 mt-1">{selectedTemplate.subtitle}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => downloadTemplatePdf(selectedTemplate, selectedVariation)}
                                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase tracking-wider hover:border-primary hover:text-primary transition-colors"
                                        >
                                            <Download size={16} /> Baixar PDF
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onSelect(selectedTemplate, selectedVariation)}
                                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
                                        >
                                            <Check size={16} /> Usar este modelo
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                                    {[
                                        ['Objetivo', selectedTemplate.goal],
                                        ['Nível', selectedTemplate.level],
                                        ['Estrutura', selectedTemplate.frequency],
                                        [type === 'workout' ? 'Equipamentos' : 'Formato', selectedTemplate.equipment],
                                    ].map(([label, value]) => (
                                        <div key={label} className="bg-white border border-slate-100 rounded-xl p-3">
                                            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</span>
                                            <span className="block text-xs font-black text-slate-800 line-clamp-2">{value}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1">
                                    {selectedTemplate.variations.map((variation, index) => (
                                        <button
                                            key={variation.name}
                                            type="button"
                                            onClick={() => setSelectedVariation(index)}
                                            className={clsx(
                                                'shrink-0 px-4 py-2.5 rounded-xl text-xs font-black border transition-all',
                                                selectedVariation === index ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-primary/40'
                                            )}
                                        >
                                            {variation.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    {type === 'workout' ? (
                                        (selectedTemplate as Extract<LibraryTemplate, { type: 'workout' }>).variations[selectedVariation].days.map(day => (
                                            <div key={day.name} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                                <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-3">
                                                    <span className="font-black text-sm">{day.name}</span>
                                                    <span className="text-[10px] text-white/60 uppercase tracking-widest font-black">{day.focus}</span>
                                                </div>
                                                <div className="divide-y divide-slate-100">
                                                    {day.exercises.map((exercise, index) => (
                                                        <div key={`${day.name}-${exercise.name}`} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-4 py-3">
                                                            <div className="min-w-0"><span className="text-xs font-black text-slate-800">{index + 1}. {exercise.name}</span><span className="block text-[10px] font-bold uppercase tracking-widest text-primary mt-0.5">{exercise.category}</span></div>
                                                            <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">{exercise.sets} séries</span>
                                                            <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">{exercise.reps}</span>
                                                            <span className="text-[10px] font-black text-slate-400 whitespace-nowrap">{exercise.rest}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        (selectedTemplate as Extract<LibraryTemplate, { type: 'diet' }>).variations[selectedVariation].meals.map(meal => (
                                            <div key={meal.name} className="bg-white rounded-2xl border border-slate-100 p-4">
                                                <h4 className="text-sm font-black text-slate-900 mb-3">{meal.name}</h4>
                                                <div className="grid sm:grid-cols-2 gap-2">
                                                    {meal.options.map(option => <div key={option} className="text-xs font-medium text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5">{option}</div>)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="mt-6 p-4 rounded-2xl bg-orange-50 border border-orange-100 text-xs font-medium leading-relaxed text-orange-900">
                                    <strong className="font-black">Revisão obrigatória:</strong> {selectedTemplate.professionalNote}
                                </div>
                                <details className="mt-4 bg-white rounded-2xl border border-slate-100 p-4">
                                    <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-slate-500">Ver texto que será aplicado na ficha</summary>
                                    <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-500 font-mono leading-relaxed">{templateToText(selectedTemplate, selectedVariation)}</pre>
                                </details>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center text-center text-slate-400 text-sm">Selecione um modelo para visualizar.</div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};
