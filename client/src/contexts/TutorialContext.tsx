
import { createContext, useContext, useState, type ReactNode } from 'react';
import Joyride, { STATUS, type CallBackProps, type Step, type Styles } from 'react-joyride';

interface TutorialContextType {
    startTutorial: (tutorialId: string) => void;
    hasSeenTutorial: (tutorialId: string) => boolean;
    activeTutorial: string | null;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (!context) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
};

interface TutorialProviderProps {
    children: ReactNode;
}

// Custom theme for the tutorial
const tutorialStyles: Partial<Styles> = {
    options: {
        arrowColor: '#fff',
        backgroundColor: '#fff',
        primaryColor: '#f97316', // Orange-500
        textColor: '#0f172a', // Slate-900
        overlayColor: 'rgba(15, 23, 42, 0.6)', // Slate-900 with opacity
        zIndex: 1000,
    },
    tooltip: {
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        padding: '20px',
    },
    buttonNext: {
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 700,
        outline: 'none',
        padding: '8px 16px',
        transition: 'all 0.2s',
    },
    buttonBack: {
        color: '#94a3b8', // Slate-400
        marginRight: '10px',
    },
    buttonSkip: {
        color: '#94a3b8',
        fontSize: '12px',
    },
};

// Define steps for each tutorial ID
// We will populate this map as we add tutorials
const TUTORIAL_STEPS: Record<string, Step[]> = {
    'dashboard': [
        {
            target: 'body',
            content: '👋 Olá! Bem-vindo ao ZapFitness. Vou te mostrar rapidinho como controlar sua academia por aqui.',
            placement: 'center',
            disableBeacon: true,
        },
        {
            target: 'aside nav',
            content: '📋 Menu Principal: Aqui ficam todas as ferramentas. Você vai usar muito a aba "Membros" e "Financeiro".',
            placement: 'right',
            disableBeacon: true,
        },
        {
            target: 'header div:nth-child(2)',
            content: '📅 Data e Perfil: Confira se hoje é feriado ou dia útil se o sistema da catraca mudar.',
            placement: 'bottom',
            disableBeacon: true,
        },
        {
            target: 'main',
            content: '📊 Visão Geral: Aqui aparecem os resumos do dia. Quem entrou, quanto entrou de dinheiro e avisos importantes.',
            placement: 'center',
            disableBeacon: true,
        }
    ],
    'members': [
        {
            target: '#btn-new-member',
            content: '➕ Novo Aluno: Clique aqui quando chegar alguém para se matricular.',
            placement: 'bottom',
            disableBeacon: true,
        },
        {
            target: '#member-search',
            content: '🔍 Pesquisa Rápida: Digite o nome ou celular para achar a ficha do aluno em segundos.',
            placement: 'bottom',
            disableBeacon: true,
        },
        {
            target: '#members-list',
            content: '📝 Lista de Alunos: Aqui você vê todos. Clique no lápis para editar ou bloquear alguém se precisar.',
            placement: 'top',
            disableBeacon: true,
        }
    ],
    'plans': [
        {
            target: '#btn-new-plan',
            content: '💰 Criar Planos: Defina seus pacotes aqui. Ex: "Mensal", "Anual", "Pilates".',
            placement: 'bottom',
            disableBeacon: true,
        },
        {
            target: '#plans-grid',
            content: '🏷️ Seus Planos: Seus pacotes ativos aparecem aqui. Você vincula esses planos aos alunos na hora da matrícula.',
            placement: 'top',
            disableBeacon: true,
        }
    ],
    'finance': [
        {
            target: '#finance-stats',
            content: '💵 Resumo do Caixa: Quanto você faturou no mês e o que ainda tem para receber.',
            placement: 'bottom',
            disableBeacon: true,
        },
        {
            target: '#invoices-list',
            content: '🧾 Cobranças: Lista de quem pagou e quem está devendo. Você pode dar baixa manual aqui.',
            placement: 'top',
            disableBeacon: true,
        }
    ],
    'turnstiles': [
        {
            target: '#turnstiles-brands',
            content: '🚧 Marca da Catraca: Escolha qual modelo você tem instalada. Isso ajusta a conexão automaticamente.',
            placement: 'bottom',
            disableBeacon: true,
        },
        {
            target: '#turnstiles-config',
            content: '🔑 Configuração: Gere o Token aqui para colocar no computador da recepção. É a "senha" para a catraca funcionar.',
            placement: 'top',
            disableBeacon: true,
        }
    ],
    'access_logs': [
        {
            target: '#access-logs-list',
            content: '👁️ Portaria Virtual: Acompanhe em tempo real quem está passando na catraca agora. Tela ótima para deixar num monitor.',
            placement: 'top',
            disableBeacon: true,
        }
    ],
    'whatsapp': [
        {
            target: '#whatsapp-panel',
            content: '📱 Conectar WhatsApp: Escaneie o QR Code com o celular da academia. Assim o sistema envia cobranças e treinos sozinho!',
            placement: 'bottom',
            disableBeacon: true,
        }
    ],
    // Add other pages here later
};

export const TutorialProvider: React.FC<TutorialProviderProps> = ({ children }) => {
    const [run, setRun] = useState(false);
    const [steps, setSteps] = useState<Step[]>([]);
    const [activeTutorial, setActiveTutorial] = useState<string | null>(null);

    // Load seen tutorials from localStorage
    const getSeenTutorials = (): string[] => {
        try {
            const stored = localStorage.getItem('zapfitness_tutorials_seen');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    };

    const hasSeenTutorial = (tutorialId: string) => {
        const seen = getSeenTutorials();
        return seen.includes(tutorialId);
    };

    const markAsSeen = (tutorialId: string) => {
        const seen = getSeenTutorials();
        if (!seen.includes(tutorialId)) {
            localStorage.setItem('zapfitness_tutorials_seen', JSON.stringify([...seen, tutorialId]));
        }
    };

    const startTutorial = (tutorialId: string) => {
        const tutorialSteps = TUTORIAL_STEPS[tutorialId];
        if (tutorialSteps) {
            setSteps(tutorialSteps);
            setActiveTutorial(tutorialId);
            setRun(true);
        } else {
            console.warn(`Tutorial ID "${tutorialId}" not found.`);
        }
    };

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;

        if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
            setRun(false);
            if (activeTutorial) {
                markAsSeen(activeTutorial);
                setActiveTutorial(null);
            }
        }
    };

    return (
        <TutorialContext.Provider value={{ startTutorial, hasSeenTutorial, activeTutorial }}>
            <Joyride
                run={run}
                steps={steps}
                continuous
                showProgress
                showSkipButton
                disableOverlayClose={true} // Force user to interact with the tour
                spotlightPadding={10}
                styles={tutorialStyles}
                callback={handleJoyrideCallback}
                locale={{
                    back: 'Voltar',
                    close: 'Fechar',
                    last: 'Concluir',
                    next: 'Próximo',
                    skip: 'Pular',
                }}
            />
            {children}
        </TutorialContext.Provider>
    );
};
