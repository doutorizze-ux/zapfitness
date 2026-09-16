import { ArrowLeft, Database, LockKeyhole, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const sections = [
    {
        icon: Database,
        title: 'Dados que tratamos',
        content: 'Podemos tratar dados necessários para o funcionamento da plataforma, como nome, e-mail, telefone, dados da academia, cadastro de alunos, planos, treinos, dietas, registros de acesso e informações relacionadas ao atendimento pelo WhatsApp.'
    },
    {
        icon: ShieldCheck,
        title: 'Como usamos os dados',
        content: 'Usamos essas informações para autenticar usuários, operar os recursos de gestão da academia, organizar treinos e planos alimentares, prestar suporte, enviar comunicações solicitadas e proteger a plataforma contra acessos indevidos.'
    },
    {
        icon: MessageCircle,
        title: 'WhatsApp e prestadores',
        content: 'Quando a academia conecta o WhatsApp, as mensagens e os dados necessários ao atendimento podem ser processados por provedores de infraestrutura e integração contratados para entregar esse recurso. Não vendemos dados pessoais.'
    },
    {
        icon: LockKeyhole,
        title: 'Segurança e retenção',
        content: 'Adotamos medidas técnicas e administrativas razoáveis para proteger os dados. Mantemos as informações enquanto a conta estiver ativa ou pelo período necessário para cumprir obrigações legais, resolver disputas e fazer cumprir contratos.'
    }
];

export const PrivacyPolicy = () => (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
            <Link
                to="/"
                className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-orange-400/50 hover:text-white"
            >
                <ArrowLeft size={16} />
                Voltar para o ZappFitness
            </Link>

            <header className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-10">
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-slate-950">
                        <ShieldCheck size={26} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-400">ZappFitness</p>
                        <p className="text-sm text-slate-400">Gestão profissional para academias</p>
                    </div>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">Política de Privacidade</h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                    Esta política explica como o ZappFitness trata informações quando academias, profissionais e seus alunos utilizam a plataforma.
                </p>
                <p className="mt-6 text-sm font-semibold text-slate-500">Última atualização: 16 de setembro de 2026</p>
            </header>

            <section className="mt-6 grid gap-4 sm:grid-cols-2">
                {sections.map(({ icon: Icon, title, content }) => (
                    <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                        <Icon className="mb-4 text-orange-400" size={24} />
                        <h2 className="text-lg font-black text-white">{title}</h2>
                        <p className="mt-3 text-sm leading-6 text-slate-400">{content}</p>
                    </article>
                ))}
            </section>

            <section className="mt-6 space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-10">
                <div>
                    <h2 className="text-xl font-black text-white">Responsabilidade da academia</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                        A academia é responsável pelos dados que cadastra na plataforma e deve ter base legal e autorização adequadas para incluir informações de seus alunos, inclusive ao utilizar recursos de comunicação e planos de treino ou alimentação.
                    </p>
                </div>
                <div>
                    <h2 className="text-xl font-black text-white">Seus direitos</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                        Você pode solicitar informações sobre o tratamento dos seus dados, correção, atualização ou exclusão quando aplicável. Alunos devem primeiro procurar a academia responsável pelo cadastro; solicitações sobre a operação da plataforma podem ser encaminhadas ao contato abaixo.
                    </p>
                </div>
                <div>
                    <h2 className="text-xl font-black text-white">Alterações e contato</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                        Esta política pode ser atualizada para refletir mudanças no serviço ou na legislação. Publicaremos a versão vigente nesta página.
                    </p>
                    <a
                        href="mailto:mauricio_dias06@hotmail.com"
                        className="mt-5 inline-flex items-center gap-2 font-bold text-orange-400 transition hover:text-orange-300"
                    >
                        <Mail size={18} />
                        mauricio_dias06@hotmail.com
                    </a>
                </div>
            </section>

            <p className="px-2 py-8 text-center text-xs text-slate-600">
                © 2026 ZappFitness. Esta página é a versão pública vigente da política de privacidade.
            </p>
        </div>
    </main>
);
