export type TemplateType = 'workout' | 'diet';

export interface TemplateExercise {
    name: string;
    category: string;
    sets: string;
    reps: string;
    rest: string;
    notes?: string;
}

export interface WorkoutDay {
    name: string;
    focus: string;
    exercises: TemplateExercise[];
}

export interface WorkoutVariation {
    name: string;
    description: string;
    days: WorkoutDay[];
}

export interface WorkoutTemplate {
    id: string;
    type: 'workout';
    title: string;
    subtitle: string;
    goal: string;
    level: string;
    frequency: string;
    equipment: string;
    tags: string[];
    variations: WorkoutVariation[];
    professionalNote: string;
}

export interface DietMeal {
    name: string;
    options: string[];
}

export interface DietVariation {
    name: string;
    description: string;
    meals: DietMeal[];
}

export interface DietTemplate {
    id: string;
    type: 'diet';
    title: string;
    subtitle: string;
    goal: string;
    level: string;
    frequency: string;
    equipment: string;
    tags: string[];
    variations: DietVariation[];
    professionalNote: string;
}

export type LibraryTemplate = WorkoutTemplate | DietTemplate;

const workoutNote = 'Modelo educacional para adultos saudáveis. O profissional deve avaliar histórico, limitações, técnica e progressão antes de aplicar.';

export const workoutTemplates: WorkoutTemplate[] = [
    {
        id: 'iniciante-full-body',
        type: 'workout',
        title: 'Base Total - Iniciante',
        subtitle: 'Adaptação, técnica e consistência',
        goal: 'Adaptação e condicionamento',
        level: 'Iniciante',
        frequency: '2 a 3x por semana',
        equipment: 'Academia completa',
        tags: ['iniciantes', 'full body', 'técnica'],
        professionalNote: workoutNote,
        variations: [
            {
                name: 'Variação A - Máquinas',
                description: 'Mais estabilidade para aprender os padrões de movimento.',
                days: [
                    {
                        name: 'Treino A', focus: 'Corpo inteiro', exercises: [
                            { name: 'Leg press 45°', category: 'Pernas', sets: '3', reps: '10-12', rest: '75s' },
                            { name: 'Chest press', category: 'Peito', sets: '3', reps: '10-12', rest: '60s' },
                            { name: 'Puxada frente', category: 'Costas', sets: '3', reps: '10-12', rest: '60s' },
                            { name: 'Cadeira flexora', category: 'Pernas', sets: '2', reps: '12-15', rest: '60s' },
                            { name: 'Prancha', category: 'Abdômen', sets: '3', reps: '20-30s', rest: '45s' },
                        ]
                    },
                    {
                        name: 'Treino B', focus: 'Corpo inteiro', exercises: [
                            { name: 'Agachamento goblet', category: 'Pernas', sets: '3', reps: '10-12', rest: '75s' },
                            { name: 'Remada baixa', category: 'Costas', sets: '3', reps: '10-12', rest: '60s' },
                            { name: 'Supino com halteres', category: 'Peito', sets: '3', reps: '10-12', rest: '60s' },
                            { name: 'Elevação pélvica', category: 'Pernas', sets: '3', reps: '12-15', rest: '60s' },
                            { name: 'Dead bug', category: 'Abdômen', sets: '3', reps: '8-10/lado', rest: '45s' },
                        ]
                    }
                ]
            },
            {
                name: 'Variação B - Livre guiada',
                description: 'Alternativa para academias com poucos aparelhos.',
                days: [
                    {
                        name: 'Treino A', focus: 'Padrões básicos', exercises: [
                            { name: 'Agachamento para banco', category: 'Pernas', sets: '3', reps: '8-12', rest: '75s' },
                            { name: 'Flexão inclinada', category: 'Peito', sets: '3', reps: '8-12', rest: '60s' },
                            { name: 'Remada com halter', category: 'Costas', sets: '3', reps: '10/lado', rest: '60s' },
                            { name: 'Levantamento terra romeno', category: 'Pernas', sets: '2', reps: '10-12', rest: '75s' },
                            { name: 'Prancha lateral', category: 'Abdômen', sets: '2', reps: '20s/lado', rest: '45s' },
                        ]
                    },
                    {
                        name: 'Treino B', focus: 'Padrões básicos', exercises: [
                            { name: 'Step-up baixo', category: 'Pernas', sets: '3', reps: '8/lado', rest: '60s' },
                            { name: 'Desenvolvimento sentado', category: 'Ombros', sets: '3', reps: '10-12', rest: '60s' },
                            { name: 'Puxada com faixa', category: 'Costas', sets: '3', reps: '12-15', rest: '60s' },
                            { name: 'Ponte de glúteos', category: 'Pernas', sets: '3', reps: '12-15', rest: '60s' },
                            { name: 'Bird dog', category: 'Abdômen', sets: '3', reps: '8/lado', rest: '45s' },
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'hipertrofia-upper-lower',
        type: 'workout',
        title: 'Construção de Massa - Upper/Lower',
        subtitle: 'Volume organizado para evolução',
        goal: 'Hipertrofia',
        level: 'Intermediário',
        frequency: '4x por semana',
        equipment: 'Academia completa',
        tags: ['hipertrofia', 'upper/lower', 'volume'],
        professionalNote: workoutNote,
        variations: [
            {
                name: 'Variação A - Clássica',
                description: 'Divisão superior/inferior com frequência equilibrada.',
                days: [
                    {
                        name: 'Superior A', focus: 'Peito e costas', exercises: [
                            { name: 'Supino reto', category: 'Peito', sets: '4', reps: '6-10', rest: '120s' },
                            { name: 'Remada curvada', category: 'Costas', sets: '4', reps: '8-12', rest: '120s' },
                            { name: 'Supino inclinado', category: 'Peito', sets: '3', reps: '8-12', rest: '90s' },
                            { name: 'Puxada frente', category: 'Costas', sets: '3', reps: '8-12', rest: '90s' },
                            { name: 'Elevação lateral', category: 'Ombros', sets: '3', reps: '12-15', rest: '60s' },
                            { name: 'Tríceps corda', category: 'Braços', sets: '3', reps: '10-15', rest: '60s' },
                        ]
                    },
                    {
                        name: 'Inferior A', focus: 'Quadríceps e glúteos', exercises: [
                            { name: 'Agachamento livre', category: 'Pernas', sets: '4', reps: '6-10', rest: '120s' },
                            { name: 'Leg press 45°', category: 'Pernas', sets: '3', reps: '10-12', rest: '90s' },
                            { name: 'Levantamento terra romeno', category: 'Pernas', sets: '3', reps: '8-12', rest: '90s' },
                            { name: 'Cadeira extensora', category: 'Pernas', sets: '3', reps: '12-15', rest: '60s' },
                            { name: 'Panturrilha em pé', category: 'Pernas', sets: '4', reps: '10-15', rest: '60s' },
                        ]
                    },
                    {
                        name: 'Superior B', focus: 'Costas e ombros', exercises: [
                            { name: 'Barra fixa assistida', category: 'Costas', sets: '4', reps: '6-10', rest: '120s' },
                            { name: 'Desenvolvimento militar', category: 'Ombros', sets: '4', reps: '6-10', rest: '120s' },
                            { name: 'Remada baixa', category: 'Costas', sets: '3', reps: '10-12', rest: '90s' },
                            { name: 'Crucifixo na máquina', category: 'Peito', sets: '3', reps: '10-15', rest: '60s' },
                            { name: 'Rosca direta', category: 'Braços', sets: '3', reps: '10-12', rest: '60s' },
                            { name: 'Face pull', category: 'Ombros', sets: '3', reps: '12-15', rest: '60s' },
                        ]
                    },
                    {
                        name: 'Inferior B', focus: 'Posterior e glúteos', exercises: [
                            { name: 'Levantamento terra com trap bar', category: 'Pernas', sets: '4', reps: '5-8', rest: '120s' },
                            { name: 'Agachamento búlgaro', category: 'Pernas', sets: '3', reps: '8-10/lado', rest: '90s' },
                            { name: 'Mesa flexora', category: 'Pernas', sets: '3', reps: '10-15', rest: '60s' },
                            { name: 'Elevação pélvica', category: 'Pernas', sets: '4', reps: '8-12', rest: '90s' },
                            { name: 'Panturrilha sentada', category: 'Pernas', sets: '4', reps: '12-15', rest: '60s' },
                        ]
                    }
                ]
            },
            {
                name: 'Variação B - Máquinas',
                description: 'Mais controle de trajetória e menor exigência técnica.',
                days: [
                    {
                        name: 'Superior A', focus: 'Peito, costas e braços', exercises: [
                            { name: 'Chest press', category: 'Peito', sets: '4', reps: '8-12', rest: '90s' },
                            { name: 'Remada articulada', category: 'Costas', sets: '4', reps: '8-12', rest: '90s' },
                            { name: 'Supino inclinado máquina', category: 'Peito', sets: '3', reps: '10-12', rest: '75s' },
                            { name: 'Puxada neutra', category: 'Costas', sets: '3', reps: '10-12', rest: '75s' },
                            { name: 'Tríceps máquina', category: 'Braços', sets: '3', reps: '12-15', rest: '60s' },
                            { name: 'Rosca máquina', category: 'Braços', sets: '3', reps: '12-15', rest: '60s' },
                        ]
                    },
                    {
                        name: 'Inferior A', focus: 'Pernas completas', exercises: [
                            { name: 'Hack machine', category: 'Pernas', sets: '4', reps: '8-12', rest: '90s' },
                            { name: 'Cadeira extensora', category: 'Pernas', sets: '3', reps: '12-15', rest: '60s' },
                            { name: 'Mesa flexora', category: 'Pernas', sets: '4', reps: '10-15', rest: '75s' },
                            { name: 'Glúteo máquina', category: 'Pernas', sets: '3', reps: '12-15/lado', rest: '60s' },
                            { name: 'Panturrilha no leg press', category: 'Pernas', sets: '4', reps: '12-20', rest: '60s' },
                        ]
                    },
                    {
                        name: 'Superior B', focus: 'Ombros e costas', exercises: [
                            { name: 'Desenvolvimento máquina', category: 'Ombros', sets: '4', reps: '8-12', rest: '90s' },
                            { name: 'Puxada alta', category: 'Costas', sets: '4', reps: '8-12', rest: '90s' },
                            { name: 'Remada baixa máquina', category: 'Costas', sets: '3', reps: '10-15', rest: '75s' },
                            { name: 'Elevação lateral máquina', category: 'Ombros', sets: '3', reps: '12-15', rest: '60s' },
                            { name: 'Peck deck invertido', category: 'Ombros', sets: '3', reps: '12-15', rest: '60s' },
                        ]
                    },
                    {
                        name: 'Inferior B', focus: 'Glúteos e posterior', exercises: [
                            { name: 'Leg press horizontal', category: 'Pernas', sets: '4', reps: '10-15', rest: '90s' },
                            { name: 'Flexora sentada', category: 'Pernas', sets: '4', reps: '10-15', rest: '75s' },
                            { name: 'Elevação pélvica máquina', category: 'Pernas', sets: '4', reps: '8-12', rest: '90s' },
                            { name: 'Abdutora', category: 'Pernas', sets: '3', reps: '15-20', rest: '60s' },
                            { name: 'Panturrilha sentada', category: 'Pernas', sets: '4', reps: '12-20', rest: '60s' },
                        ]
                    }
                ]
            }
        ]
    },
    {
        id: 'forca-base',
        type: 'workout',
        title: 'Força Base',
        subtitle: 'Progressão nos movimentos fundamentais',
        goal: 'Força',
        level: 'Intermediário',
        frequency: '3x por semana',
        equipment: 'Pesos livres',
        tags: ['força', 'progressão', 'fundamentos'],
        professionalNote: 'Modelo para praticantes com técnica consolidada. Cargas, amplitude e progressão devem ser definidas pelo profissional responsável.',
        variations: [
            {
                name: 'Variação A - Full body',
                description: 'Alternância de padrões com recuperação entre sessões.',
                days: [
                    { name: 'Sessão A', focus: 'Agachar e empurrar', exercises: [
                        { name: 'Agachamento livre', category: 'Pernas', sets: '4', reps: '4-6', rest: '150s' },
                        { name: 'Supino reto', category: 'Peito', sets: '4', reps: '4-6', rest: '150s' },
                        { name: 'Remada curvada', category: 'Costas', sets: '3', reps: '6-8', rest: '120s' },
                        { name: 'Prancha com carga', category: 'Abdômen', sets: '3', reps: '20-30s', rest: '60s' },
                    ] },
                    { name: 'Sessão B', focus: 'Puxar e posterior', exercises: [
                        { name: 'Levantamento terra', category: 'Pernas', sets: '3', reps: '3-5', rest: '180s' },
                        { name: 'Desenvolvimento militar', category: 'Ombros', sets: '4', reps: '4-6', rest: '120s' },
                        { name: 'Barra fixa', category: 'Costas', sets: '4', reps: '4-8', rest: '120s' },
                        { name: 'Farmer walk', category: 'Cardio', sets: '3', reps: '30-40m', rest: '90s' },
                    ] },
                    { name: 'Sessão C', focus: 'Volume técnico', exercises: [
                        { name: 'Agachamento frontal', category: 'Pernas', sets: '3', reps: '5-8', rest: '120s' },
                        { name: 'Supino inclinado', category: 'Peito', sets: '3', reps: '6-8', rest: '120s' },
                        { name: 'Remada unilateral', category: 'Costas', sets: '3', reps: '8/lado', rest: '90s' },
                        { name: 'Elevação pélvica', category: 'Pernas', sets: '3', reps: '8-10', rest: '90s' },
                    ] }
                ]
            },
            {
                name: 'Variação B - Halteres',
                description: 'Alternativa para menor carga absoluta e mais controle unilateral.',
                days: [
                    { name: 'Sessão A', focus: 'Pernas e peito', exercises: [
                        { name: 'Agachamento goblet', category: 'Pernas', sets: '4', reps: '6-10', rest: '120s' },
                        { name: 'Supino com halteres', category: 'Peito', sets: '4', reps: '6-10', rest: '120s' },
                        { name: 'Remada com halter', category: 'Costas', sets: '3', reps: '8/lado', rest: '90s' },
                        { name: 'Prancha lateral', category: 'Abdômen', sets: '3', reps: '20-30s/lado', rest: '60s' },
                    ] },
                    { name: 'Sessão B', focus: 'Posterior e ombros', exercises: [
                        { name: 'Levantamento terra romeno', category: 'Pernas', sets: '4', reps: '6-8', rest: '120s' },
                        { name: 'Desenvolvimento com halteres', category: 'Ombros', sets: '4', reps: '6-10', rest: '120s' },
                        { name: 'Puxada na faixa', category: 'Costas', sets: '4', reps: '8-12', rest: '90s' },
                        { name: 'Farmer walk', category: 'Cardio', sets: '3', reps: '30m', rest: '90s' },
                    ] },
                    { name: 'Sessão C', focus: 'Unilateral e técnica', exercises: [
                        { name: 'Agachamento búlgaro', category: 'Pernas', sets: '3', reps: '6-8/lado', rest: '120s' },
                        { name: 'Flexão com pausa', category: 'Peito', sets: '3', reps: '6-12', rest: '90s' },
                        { name: 'Remada apoiada', category: 'Costas', sets: '3', reps: '8-10', rest: '90s' },
                        { name: 'Ponte de glúteos', category: 'Pernas', sets: '3', reps: '10-12', rest: '75s' },
                    ] }
                ]
            }
        ]
    },
    {
        id: 'emagrecimento-circuito',
        type: 'workout',
        title: 'Movimento e Condicionamento',
        subtitle: 'Circuitos dinâmicos e sustentáveis',
        goal: 'Emagrecimento e condicionamento',
        level: 'Iniciante / Intermediário',
        frequency: '3x por semana',
        equipment: 'Academia ou estúdio',
        tags: ['emagrecimento', 'circuito', 'condicionamento'],
        professionalNote: 'A intensidade deve ser adaptada ao nível de condicionamento. Interromper diante de dor, tontura ou mal-estar e encaminhar para avaliação quando necessário.',
        variations: [
            {
                name: 'Variação A - Circuito 1',
                description: '3 a 4 voltas, mantendo técnica e ritmo conversável.',
                days: [
                    { name: 'Circuito A', focus: 'Corpo inteiro', exercises: [
                        { name: 'Agachamento no banco', category: 'Pernas', sets: '3', reps: '10-12', rest: '30s' },
                        { name: 'Remada baixa', category: 'Costas', sets: '3', reps: '10-12', rest: '30s' },
                        { name: 'Supino máquina', category: 'Peito', sets: '3', reps: '10-12', rest: '30s' },
                        { name: 'Step-up', category: 'Pernas', sets: '3', reps: '8/lado', rest: '30s' },
                        { name: 'Bicicleta', category: 'Cardio', sets: '3', reps: '60s', rest: '90s' },
                    ] },
                    { name: 'Circuito B', focus: 'Corpo inteiro', exercises: [
                        { name: 'Leg press', category: 'Pernas', sets: '3', reps: '12', rest: '30s' },
                        { name: 'Puxada frente', category: 'Costas', sets: '3', reps: '12', rest: '30s' },
                        { name: 'Desenvolvimento máquina', category: 'Ombros', sets: '3', reps: '10-12', rest: '30s' },
                        { name: 'Ponte de glúteos', category: 'Pernas', sets: '3', reps: '15', rest: '30s' },
                        { name: 'Caminhada inclinada', category: 'Cardio', sets: '3', reps: '3min', rest: '90s' },
                    ] }
                ]
            },
            {
                name: 'Variação B - Baixo impacto',
                description: 'Opção com menor impacto articular e intervalos mais longos.',
                days: [
                    { name: 'Sessão A', focus: 'Baixo impacto', exercises: [
                        { name: 'Sentar e levantar', category: 'Pernas', sets: '3', reps: '10', rest: '45s' },
                        { name: 'Remada com faixa', category: 'Costas', sets: '3', reps: '12', rest: '45s' },
                        { name: 'Flexão na parede', category: 'Peito', sets: '3', reps: '10', rest: '45s' },
                        { name: 'Marcha estacionária', category: 'Cardio', sets: '3', reps: '60s', rest: '90s' },
                    ] },
                    { name: 'Sessão B', focus: 'Baixo impacto', exercises: [
                        { name: 'Leg press leve', category: 'Pernas', sets: '3', reps: '12', rest: '45s' },
                        { name: 'Puxada neutra', category: 'Costas', sets: '3', reps: '12', rest: '45s' },
                        { name: 'Elevação pélvica', category: 'Pernas', sets: '3', reps: '12', rest: '45s' },
                        { name: 'Elíptico', category: 'Cardio', sets: '3', reps: '3min', rest: '90s' },
                    ] }
                ]
            }
        ]
    },
    {
        id: 'casa-30-minutos',
        type: 'workout',
        title: 'Treino em Casa - 30 min',
        subtitle: 'Prático para manter a rotina',
        goal: 'Condicionamento geral',
        level: 'Iniciante / Intermediário',
        frequency: '3x por semana',
        equipment: 'Peso corporal e faixa',
        tags: ['casa', '30 minutos', 'peso corporal'],
        professionalNote: workoutNote,
        variations: [
            {
                name: 'Variação A - Peso corporal',
                description: 'Circuito simples para espaços pequenos.',
                days: [
                    { name: 'Treino A', focus: 'Corpo inteiro', exercises: [
                        { name: 'Agachamento livre', category: 'Pernas', sets: '3', reps: '12-15', rest: '45s' },
                        { name: 'Flexão inclinada', category: 'Peito', sets: '3', reps: '8-12', rest: '45s' },
                        { name: 'Avanço alternado', category: 'Pernas', sets: '3', reps: '8/lado', rest: '45s' },
                        { name: 'Prancha', category: 'Abdômen', sets: '3', reps: '20-40s', rest: '45s' },
                        { name: 'Polichinelo sem salto', category: 'Cardio', sets: '3', reps: '45s', rest: '75s' },
                    ] },
                    { name: 'Treino B', focus: 'Corpo inteiro', exercises: [
                        { name: 'Agachamento isométrico', category: 'Pernas', sets: '3', reps: '30s', rest: '45s' },
                        { name: 'Flexão na parede', category: 'Peito', sets: '3', reps: '12-15', rest: '45s' },
                        { name: 'Ponte de glúteos', category: 'Pernas', sets: '3', reps: '15-20', rest: '45s' },
                        { name: 'Bird dog', category: 'Abdômen', sets: '3', reps: '8/lado', rest: '45s' },
                        { name: 'Marcha rápida', category: 'Cardio', sets: '3', reps: '60s', rest: '75s' },
                    ] }
                ]
            },
            {
                name: 'Variação B - Faixas elásticas',
                description: 'Mais opções de resistência com equipamento acessível.',
                days: [
                    { name: 'Treino A', focus: 'Força geral', exercises: [
                        { name: 'Agachamento com faixa', category: 'Pernas', sets: '3', reps: '12-15', rest: '45s' },
                        { name: 'Remada com faixa', category: 'Costas', sets: '3', reps: '12-15', rest: '45s' },
                        { name: 'Chest press com faixa', category: 'Peito', sets: '3', reps: '12-15', rest: '45s' },
                        { name: 'Abdução com faixa', category: 'Pernas', sets: '3', reps: '15/lado', rest: '45s' },
                        { name: 'Mountain climber lento', category: 'Cardio', sets: '3', reps: '30s', rest: '75s' },
                    ] },
                    { name: 'Treino B', focus: 'Força geral', exercises: [
                        { name: 'Levantamento terra com faixa', category: 'Pernas', sets: '3', reps: '12', rest: '45s' },
                        { name: 'Desenvolvimento com faixa', category: 'Ombros', sets: '3', reps: '12', rest: '45s' },
                        { name: 'Puxada com faixa', category: 'Costas', sets: '3', reps: '12', rest: '45s' },
                        { name: 'Ponte unilateral', category: 'Pernas', sets: '3', reps: '10/lado', rest: '45s' },
                        { name: 'Caminhada lateral com faixa', category: 'Cardio', sets: '3', reps: '45s', rest: '75s' },
                    ] }
                ]
            }
        ]
    }
];

const dietNote = 'Modelo de educação alimentar. Quantidades, calorias, alergias, condições clínicas e distribuição de macros devem ser definidos e revisados pelo nutricionista responsável.';

export const dietTemplates: DietTemplate[] = [
    {
        id: 'rotina-equilibrada',
        type: 'diet',
        title: 'Rotina Equilibrada',
        subtitle: 'Base simples para organização alimentar',
        goal: 'Educação alimentar',
        level: 'Adultos saudáveis',
        frequency: '3 refeições principais',
        equipment: 'Sem restrição',
        tags: ['equilibrada', 'rotina', 'prática'],
        professionalNote: dietNote,
        variations: [
            {
                name: 'Variação A - Tradicional',
                description: 'Estrutura com alimentos comuns e preparações simples.',
                meals: [
                    { name: 'Café da manhã', options: ['Ovos + pão integral + fruta', 'Iogurte natural + aveia + banana', 'Cuscuz + ovos + fruta'] },
                    { name: 'Almoço', options: ['Arroz + feijão + frango + salada', 'Batata + carne magra + legumes', 'Macarrão simples + atum + salada'] },
                    { name: 'Jantar', options: ['Repetir estrutura do almoço', 'Omelete com legumes + arroz', 'Sopa de legumes com fonte de proteína'] },
                ]
            },
            {
                name: 'Variação B - Sem fogão no trabalho',
                description: 'Opções para levar ou montar rapidamente.',
                meals: [
                    { name: 'Café da manhã', options: ['Iogurte natural + fruta + aveia', 'Sanduíche de frango desfiado + fruta', 'Leite ou bebida sem açúcar + pão + queijo'] },
                    { name: 'Almoço', options: ['Marmita com arroz, feijão, proteína e salada', 'Salada completa com grãos e proteína', 'Prato feito priorizando comida de verdade'] },
                    { name: 'Jantar', options: ['Wrap com frango e salada', 'Ovos mexidos + pão + legumes', 'Refeição congelada caseira equilibrada'] },
                ]
            }
        ]
    },
    {
        id: 'rotina-pratica-4-refeicoes',
        type: 'diet',
        title: 'Rotina Prática - 4 Refeições',
        subtitle: 'Organização para dias corridos',
        goal: 'Adesão e praticidade',
        level: 'Adultos saudáveis',
        frequency: '4 refeições',
        equipment: 'Sem restrição',
        tags: ['prática', 'trabalho', '4 refeições'],
        professionalNote: dietNote,
        variations: [
            {
                name: 'Variação A - Marmitas',
                description: 'Uma preparação base para reduzir decisões durante a semana.',
                meals: [
                    { name: 'Refeição 1', options: ['Ovos + tapioca + fruta', 'Iogurte natural + aveia + fruta'] },
                    { name: 'Refeição 2', options: ['Arroz + feijão + frango + legumes', 'Batata + carne moída + salada'] },
                    { name: 'Refeição 3', options: ['Fruta + iogurte', 'Sanduíche integral com queijo e frango', 'Castanhas + fruta'] },
                    { name: 'Refeição 4', options: ['Arroz + feijão + peixe + salada', 'Omelete + legumes + pão', 'Sopa caseira com proteína'] },
                ]
            },
            {
                name: 'Variação B - Montagem rápida',
                description: 'Combinações modulares para quem cozinha pouco.',
                meals: [
                    { name: 'Refeição 1', options: ['Pão + queijo + ovos + café sem açúcar', 'Vitamina de leite, banana e aveia'] },
                    { name: 'Refeição 2', options: ['Prato feito com arroz, feijão, proteína e vegetais', 'Frango pronto + arroz + salada lavada'] },
                    { name: 'Refeição 3', options: ['Iogurte + fruta', 'Sanduíche de atum + folhas', 'Fruta + oleaginosas'] },
                    { name: 'Refeição 4', options: ['Ovos + batata + legumes', 'Repetição planejada do almoço', 'Cuscuz + frango + salada'] },
                ]
            }
        ]
    },
    {
        id: 'ganho-massa-base',
        type: 'diet',
        title: 'Suporte ao Ganho de Massa',
        subtitle: 'Estrutura com proteína em todas as refeições',
        goal: 'Ganho de massa muscular',
        level: 'Adultos saudáveis',
        frequency: '4 a 5 refeições',
        equipment: 'Sem restrição',
        tags: ['massa muscular', 'proteína', 'treino'],
        professionalNote: dietNote,
        variations: [
            {
                name: 'Variação A - Tradicional',
                description: 'Distribuição prática ao redor do treino.',
                meals: [
                    { name: 'Café da manhã', options: ['Ovos + pão ou cuscuz + fruta', 'Iogurte + aveia + fruta + ovos'] },
                    { name: 'Almoço', options: ['Arroz + feijão + carne ou frango + legumes', 'Massa + carne moída + salada'] },
                    { name: 'Pré-treino', options: ['Banana + aveia + iogurte', 'Pão + ovos ou queijo', 'Fruta + sanduíche simples'] },
                    { name: 'Pós-treino', options: ['Refeição completa com proteína e carboidrato', 'Iogurte ou leite + fruta, conforme orientação'] },
                    { name: 'Jantar', options: ['Arroz + feijão + peixe + salada', 'Batata + frango + legumes'] },
                ]
            },
            {
                name: 'Variação B - Alta praticidade',
                description: 'Para quem precisa de soluções rápidas sem perder estrutura.',
                meals: [
                    { name: 'Refeição 1', options: ['Sanduíche de ovos + fruta', 'Iogurte proteico + aveia + banana'] },
                    { name: 'Refeição 2', options: ['Marmita de arroz, feijão, proteína e salada', 'Prato feito equilibrado'] },
                    { name: 'Refeição 3', options: ['Leite + fruta + aveia', 'Sanduíche de frango', 'Iogurte + fruta'] },
                    { name: 'Refeição 4', options: ['Refeição completa pós-treino', 'Omelete + pão + legumes'] },
                    { name: 'Refeição 5', options: ['Ceia conforme necessidade individual', 'Iogurte natural ou leite, conforme prescrição'] },
                ]
            }
        ]
    },
    {
        id: 'reducao-gordura-base',
        type: 'diet',
        title: 'Redução de Gordura com Saciedade',
        subtitle: 'Mais fibras, volume e previsibilidade',
        goal: 'Redução de gordura',
        level: 'Adultos saudáveis',
        frequency: '3 a 4 refeições',
        equipment: 'Sem restrição',
        tags: ['saciedade', 'fibras', 'redução de gordura'],
        professionalNote: dietNote,
        variations: [
            {
                name: 'Variação A - Prato completo',
                description: 'Estrutura flexível que prioriza comida de verdade.',
                meals: [
                    { name: 'Refeição 1', options: ['Ovos + fruta + pão integral', 'Iogurte natural + fruta + aveia'] },
                    { name: 'Refeição 2', options: ['Metade do prato de vegetais + proteína + arroz e feijão', 'Batata + frango + legumes variados'] },
                    { name: 'Refeição 3', options: ['Fruta + iogurte', 'Pipoca caseira + fruta', 'Sanduíche com proteína e salada'] },
                    { name: 'Refeição 4', options: ['Sopa de legumes com proteína', 'Omelete grande com salada', 'Repetição planejada do almoço'] },
                ]
            },
            {
                name: 'Variação B - Volume de vegetais',
                description: 'Alternativa para quem sente fome entre as refeições.',
                meals: [
                    { name: 'Refeição 1', options: ['Omelete com vegetais + fruta', 'Aveia com iogurte natural + fruta'] },
                    { name: 'Refeição 2', options: ['Salada variada + feijão + frango + pequena porção de arroz', 'Legumes assados + peixe + batata'] },
                    { name: 'Refeição 3', options: ['Fruta inteira + iogurte', 'Palitos de vegetais + homus', 'Pipoca caseira'] },
                    { name: 'Refeição 4', options: ['Prato de vegetais + proteína', 'Ovos mexidos + legumes + pão integral'] },
                ]
            }
        ]
    },
    {
        id: 'vegetariana-pratica',
        type: 'diet',
        title: 'Vegetariana Prática',
        subtitle: 'Combinações sem carne para o dia a dia',
        goal: 'Alimentação vegetariana',
        level: 'Adultos saudáveis',
        frequency: '4 refeições',
        equipment: 'Sem restrição',
        tags: ['vegetariana', 'leguminosas', 'prática'],
        professionalNote: 'A adequação de proteínas, ferro, vitamina B12 e demais nutrientes deve ser revisada pelo nutricionista conforme o padrão vegetariano e as necessidades individuais.',
        variations: [
            {
                name: 'Variação A - Ovolactovegetariana',
                description: 'Inclui ovos e laticínios como opções de proteína.',
                meals: [
                    { name: 'Refeição 1', options: ['Ovos + pão integral + fruta', 'Iogurte natural + aveia + fruta'] },
                    { name: 'Refeição 2', options: ['Arroz + feijão + ovos + salada', 'Lentilha + arroz + legumes + queijo'] },
                    { name: 'Refeição 3', options: ['Iogurte + fruta', 'Pão com queijo + fruta', 'Homus + torradas'] },
                    { name: 'Refeição 4', options: ['Omelete com legumes + batata', 'Grão-de-bico + quinoa + salada', 'Tofu grelhado + arroz + vegetais'] },
                ]
            },
            {
                name: 'Variação B - Sem laticínios',
                description: 'Alternativas com leguminosas, tofu e preparações vegetais.',
                meals: [
                    { name: 'Refeição 1', options: ['Tofu mexido + pão + fruta', 'Aveia com bebida vegetal fortificada + fruta'] },
                    { name: 'Refeição 2', options: ['Arroz + feijão + tofu + salada', 'Lentilha + batata + legumes'] },
                    { name: 'Refeição 3', options: ['Fruta + pasta de amendoim', 'Homus + cenoura + torradas', 'Edamame + fruta'] },
                    { name: 'Refeição 4', options: ['Grão-de-bico + quinoa + legumes', 'Tofu + macarrão + vegetais', 'Feijão + arroz + salada variada'] },
                ]
            }
        ]
    }
];

export const allTemplates: LibraryTemplate[] = [...workoutTemplates, ...dietTemplates];

export function templateToText(template: LibraryTemplate, variationIndex = 0): string {
    if (template.type === 'workout') {
        const variation = template.variations[variationIndex] || template.variations[0];
        return [
            `📋 ${template.title.toUpperCase()}`,
            `${variation.name} - ${variation.description}`,
            `Objetivo: ${template.goal} | Frequência: ${template.frequency}`,
            '',
            ...variation.days.flatMap(day => [
                `${day.name.toUpperCase()} - ${day.focus}`,
                ...day.exercises.map((exercise, index) => `${index + 1}. ${exercise.name} | ${exercise.sets} séries | ${exercise.reps} | descanso ${exercise.rest}${exercise.notes ? ` | ${exercise.notes}` : ''}`),
                ''
            ]),
            `Observação profissional: ${template.professionalNote}`
        ].join('\n');
    }

    const variation = template.variations[variationIndex] || template.variations[0];
    return [
        `🥗 ${template.title.toUpperCase()}`,
        `${variation.name} - ${variation.description}`,
        `Objetivo: ${template.goal} | Estrutura: ${template.frequency}`,
        '',
        ...variation.meals.flatMap(meal => [
            meal.name.toUpperCase(),
            ...meal.options.map((option, index) => `${index + 1}. ${option}`),
            ''
        ]),
        `Observação profissional: ${template.professionalNote}`
    ].join('\n');
}
