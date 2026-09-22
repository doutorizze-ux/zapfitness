import { choice, noul, score, TypeSafeClient } from '@typesafe-ai/sdk';

export type TypeSafeLeadAnalysis = {
    ai_intent: string;
    ai_topic: string;
    ai_objection: string;
    ai_sentiment: string;
    ai_next_action: string;
    ai_priority: number;
    ai_qualified: boolean;
    ai_needs_human: boolean;
    ai_is_spam: boolean;
    ai_confidence: number;
    ai_analyzed_at: Date;
};

let client: TypeSafeClient | null = null;

function getClient() {
    if (!process.env.TYPESAFE_API_KEY) return null;
    client ??= new TypeSafeClient();
    return client;
}

/**
 * Turns one inbound WhatsApp message into a sales recommendation. This never
 * sends a message or changes a lead's funnel stage; a person remains in charge
 * of the commercial action.
 */
export async function qualifyLeadWithTypeSafe(input: {
    messages: Array<{ content: string; fromMe: boolean }>;
}): Promise<TypeSafeLeadAnalysis | null> {
    const typesafe = getClient();
    if (!typesafe) return null;

    const response = await typesafe.systemOne({
        state: {
            lead: {
                recent_messages: input.messages,
            },
        },
        questions: {
            purchaseIntent: choice('Qual é a intenção de compra demonstrada nas mensagens recentes de `lead`?', {
                cold: 'Sem intenção clara de comprar; é apenas curiosidade, saudação ou conversa geral.',
                warm: 'Há interesse em conhecer a academia, planos ou aulas, mas faltam sinais concretos de decisão.',
                hot: 'Há intenção concreta de matrícula: pergunta preço, plano, aula experimental, horário, localização ou próximo passo.',
            }),
            topic: choice('Qual é o principal assunto que o lead quer resolver?', {
                pricing: 'Mensalidade, preço, promoção, formas de pagamento ou planos.',
                trial: 'Aula experimental, visita ou conhecer a academia antes de decidir.',
                schedule: 'Horários de funcionamento, aulas, treino ou disponibilidade.',
                location: 'Endereço, bairro, como chegar ou estacionamento.',
                enrollment: 'Matrícula, documentos, início ou contratação.',
                cancellation: 'Cancelar, desistir, reembolso ou encerrar um plano.',
                other: 'Outro assunto ou não há contexto suficiente.',
            }),
            objection: choice('Qual obstáculo mais provável para a matrícula aparece nas mensagens?', {
                none: 'Nenhum obstáculo claro; a pessoa quer avançar.',
                price: 'Preço, desconto, orçamento ou custo.',
                schedule: 'Horários, rotina ou disponibilidade.',
                location: 'Distância, endereço, transporte ou estacionamento.',
                trust: 'Dúvida sobre qualidade, estrutura, contrato ou resultado.',
                other: 'Outro obstáculo ou contexto insuficiente.',
            }),
            sentiment: choice('Qual é o tom predominante da pessoa nas mensagens?', {
                interested: 'Interessada, animada ou pronta para avançar.',
                neutral: 'Neutra, apenas buscando informação.',
                frustrated: 'Frustrada, reclamando ou insatisfeita.',
                urgent: 'Demonstra pressa, prazo ou necessidade imediata.',
            }),
            nextAction: choice('Qual é a melhor próxima ação comercial para este lead de academia?', {
                send_plans: 'Enviar planos, preços, localização ou informações iniciais solicitadas.',
                invite_trial: 'Convidar para uma aula experimental ou visita à academia.',
                human_follow_up: 'Um atendente deve responder logo porque há interesse concreto ou uma pergunta específica.',
                nurture: 'Registrar o interesse e fazer acompanhamento posterior; ainda não é momento de venda direta.',
            }),
            priority: score('Qual prioridade este lead deve receber?', [
                'Baixa: não há demanda comercial concreta.',
                'Média: demonstra interesse, mas ainda faltam informações importantes.',
                'Alta: há sinais fortes de que pode se matricular em breve.',
            ]),
            qualified: noul('Este lead parece qualificado para receber atendimento comercial humano agora?'),
            needsHuman: noul('A pessoa pede ou precisa de uma resposta humana específica agora?'),
            isSpam: noul('A mensagem é spam, golpe, propaganda não solicitada ou conteúdo sem relação com a academia?'),
        },
    });

    return {
        ai_intent: response.answers.purchaseIntent.choice,
        ai_topic: response.answers.topic.choice,
        ai_objection: response.answers.objection.choice,
        ai_sentiment: response.answers.sentiment.choice,
        ai_next_action: response.answers.nextAction.choice,
        ai_priority: response.answers.priority.score,
        ai_qualified: response.answers.qualified.noul >= 0.8,
        ai_needs_human: response.answers.needsHuman.noul >= 0.8,
        ai_is_spam: response.answers.isSpam.noul >= 0.8,
        ai_confidence: response.answers.purchaseIntent.confidence,
        ai_analyzed_at: new Date(),
    };
}
