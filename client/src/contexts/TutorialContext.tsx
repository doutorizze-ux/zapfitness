
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
            content: 'Bem-vindo ao ZapFitness! 👋 Vamos fazer um tour rápido para você aproveitar ao máximo seu sistema.',
            placement: 'center',
        },
        {
            target: 'aside nav', // Target the sidebar
            content: 'Aqui é o seu menu principal. Navegue entre Planos, Membros, Financeiro e muito mais.',
            placement: 'right',
        },
        {
            target: 'header div:nth-child(2)', // Adjust selector for user profile/date
            content: 'Veja a data e seu perfil rapidamente aqui no topo.',
            placement: 'bottom',
        },
        {
            target: 'main',
            content: 'Esta é a área principal onde seus dados e relatórios aparecem.',
            placement: 'center',
        }
    ],
    'members': [
        {
            target: '#btn-new-member',
            content: 'Clique aqui para cadastrar um novo aluno manualmente.',
            placement: 'bottom',
        },
        {
            target: '#member-search',
            content: 'Busque alunos pelo nome ou telefone rapidamente.',
            placement: 'bottom',
        },
        {
            target: '#members-list',
            content: 'Aqui você visualiza todos os alunos, seus planos e status. Clique no lápis para editar.',
            placement: 'top',
        }
    ],
    'plans': [
        {
            target: '#btn-new-plan',
            content: 'Crie novos planos de assinatura (Mensal, Trimestral, etc.) para vincular aos alunos.',
            placement: 'bottom',
        },
        {
            target: '#plans-grid',
            content: 'Gerencie seus planos ativos aqui. Você pode ver o preço e a duração de cada um.',
            placement: 'top',
        }
    ],
    'finance': [
        {
            target: '#finance-stats',
            content: 'Visualize rapidamente sua renda mensal, e os valores pendentes ou atrasados.',
            placement: 'bottom',
        },
        {
            target: '#invoices-list',
            content: 'Acompanhe todas as cobranças geradas. Confirme pagamentos manuais clicando em "Confirmar Pago".',
            placement: 'top'
        }
    ],
    'turnstiles': [
        {
            target: '#turnstiles-brands',
            content: 'Selecione a marca da sua catraca aqui. Cada uma tem um modo de conexão diferente.',
            placement: 'bottom',
        },
        {
            target: '#turnstiles-config',
            content: 'Aqui você gera o Token de Acesso para conectar o software da catraca (ZappBridge) ao sistema.',
            placement: 'top',
        }
    ],
    'access_logs': [
        {
            target: '#access-logs-list',
            content: 'Este painel mostra quem está entrando na academia agora. O status "LIBERADO" ou "NEGADO" atualiza em tempo real.',
            placement: 'top',
        }
    ],
    'whatsapp': [
        {
            target: '#whatsapp-panel',
            content: 'Conecte o WhatsApp da academia aqui. Escaneie o QR Code igual ao WhatsApp Web.',
            placement: 'bottom',
        },
        {
            target: '#whatsapp-qr',
            content: 'Imprima este QR Code e coloque na recepção. Seus alunos pode fazer check-in apenas escaneando ele!',
            placement: 'top',
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
