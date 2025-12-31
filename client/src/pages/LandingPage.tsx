
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Zap, Shield, Smartphone, ArrowRight, Instagram, MessageSquare, Target, UserCheck, Star } from 'lucide-react';

export const LandingPage = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [plansQuery, setPlansQuery] = useState<any[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [planError, setPlanError] = useState(false);
    const [debugError, setDebugError] = useState('');
    const [debugUrl, setDebugUrl] = useState('');

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);

        const fetchPlans = async () => {
            let apiUrl = import.meta.env.VITE_API_URL || 'https://api.zapp.fitness/api';
            if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
            if (!apiUrl.endsWith('/api')) apiUrl += '/api';

            const url = `${apiUrl}/saas/plans`;
            setDebugUrl(url);

            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Status: ${res.status} ${res.statusText}`);
                const data = await res.json();
                if (Array.isArray(data)) setPlansQuery(data);
            } catch (err: any) {
                console.error(err);
                setPlanError(true);
                setDebugError(err.message || String(err));
            } finally {
                setLoadingPlans(false);
            }
        };

        fetchPlans();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        { icon: <Zap className="text-orange-500" />, title: "Automação via WhatsApp", desc: "Seu aluno pede treino, dieta e faz check-in direto pelo Whats, sem baixar apps." },
        { icon: <CheckCircle className="text-green-500" />, title: "Check-in Inteligente", desc: "Controle de acesso por QR Code com validação instantânea de pagamentos e horários." },
        { icon: <Shield className="text-blue-500" />, title: "Gestão Financeira", desc: "Bloqueio automático de inadimplentes e controle total de planos e renovações." },
        { icon: <Smartphone className="text-purple-500" />, title: "App do Aluno (Sem App)", desc: "Tudo acontece no chat que eles já usam todo dia. Engajamento máximo." }
    ];

    return (
        <div className="font-sans antialiased text-slate-800 bg-white selection:bg-orange-100 selection:text-orange-900">
            {/* Navbar */}
            <nav className={`fixed w-full z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-xl py-3 border-b border-white/10' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center border border-white/10 shadow-lg shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <Zap className="text-white fill-white" size={20} />
                        </div>
                        <span className="text-2xl font-black tracking-tight text-white">
                            Zapp<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">Fitness</span>
                        </span>
                    </div>
                    <div className="hidden md:flex gap-8 text-sm font-semibold text-slate-300">
                        <a href="#features" className="hover:text-white transition-colors relative group py-2">
                            Funcionalidades
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
                        </a>
                        <a href="#demo" className="hover:text-white transition-colors relative group py-2">
                            Demonstração
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
                        </a>
                        <a href="#pricing" className="hover:text-white transition-colors relative group py-2">
                            Planos
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
                        </a>
                    </div>
                    <div className="flex gap-4 items-center">
                        <button onClick={() => navigate('/login')} className="text-white hover:text-orange-400 transition-colors font-semibold hidden sm:block">Entrar</button>
                        <button onClick={() => navigate('/register')} className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-6 py-2.5 rounded-full font-bold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transform hover:-translate-y-1 active:scale-95">
                            Começar Agora
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-32 pb-20 lg:pt-56 lg:pb-40 overflow-hidden bg-black text-white">
                {/* Visual Background */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/landing/gym-interior.png"
                        alt="High-end Gym"
                        className="w-full h-full object-cover opacity-40 mix-blend-luminosity scale-105 animate-pulse-slow"
                        style={{ animationDuration: '10s' }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-slate-50"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-6 text-center z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 animate-fade-in animate-float">
                        <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-ping"></span>
                        <span className="text-xs font-bold text-slate-100 uppercase tracking-widest px-2">Lançamento ZapFitness 2.0</span>
                    </div>
                    <h1 className="text-5xl lg:text-8xl font-black tracking-tighter mb-8 leading-[1.1]">
                        Transforme seu WhatsApp na <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-red-600">Recepção da sua Academia</span>
                    </h1>
                    <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12 leading-relaxed font-medium">
                        Diga adeus à burocracia. Automatize treinos, pagamentos e controle de acesso direto pelo chat. <br className="hidden md:block" />
                        Mais conveniência para seu aluno, mais lucro para você.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        <button onClick={() => navigate('/register')} className="bg-orange-500 text-white px-10 py-5 rounded-full font-black text-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 transform hover:-translate-y-1">
                            TESTAR GRÁTIS POR 7 DIAS
                            <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform duration-300" />
                        </button>
                        <button onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })} className="px-10 py-5 rounded-full font-bold text-lg border-2 border-white/20 hover:border-white/40 hover:bg-white/5 backdrop-blur-md transition-all text-white flex items-center justify-center gap-2 group">
                            <MessageSquare className="group-hover:scale-110 transition-transform" />
                            Ver Demonstração do Bot
                        </button>
                    </div>

                    <div className="mt-20 pt-10 border-t border-white/10 max-w-4xl mx-auto">
                        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                            <span className="text-2xl font-black text-white tracking-widest italic uppercase">IRON-GYM</span>
                            <span className="text-2xl font-black text-white tracking-tight uppercase">Titan <span className="text-orange-500">Fitness</span></span>
                            <span className="text-2xl font-black text-white tracking-tighter italic">CROSS-CORE</span>
                            <span className="text-2xl font-black text-white tracking-[0.2em]">PLATINUM</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Chatbot Experience Section */}
            <section id="demo" className="py-24 bg-slate-50 overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="relative order-2 lg:order-1">
                            <div className="absolute -top-10 -left-10 w-64 h-64 bg-orange-200/50 rounded-full blur-3xl -z-10"></div>
                            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-red-100/50 rounded-full blur-3xl -z-10"></div>

                            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white group">
                                <img
                                    src="/landing/whatsapp-bot.png"
                                    alt="WhatsApp Bot Experience"
                                    className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/20">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bot Online agora</span>
                                    </div>
                                    <p className="text-slate-800 font-bold italic">"Oi, João! Seu treino de pernas já está pronto. Vamos começar?"</p>
                                </div>
                            </div>
                        </div>

                        <div className="order-1 lg:order-2">
                            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-6 leading-tight">
                                Um "Personal Trainer" <br />
                                <span className="text-orange-600">Dentros do Bolso</span>
                            </h2>
                            <p className="text-lg text-slate-600 mb-10 leading-relaxed">
                                Ninguém quer baixar mais um aplicativo que consome memória. Seus alunos já usam o WhatsApp 24 horas por dia.
                                Nossa tecnologia integra tudo o que uma academia de elite precisa:
                            </p>

                            <div className="space-y-6">
                                {[
                                    { icon: <Target className="text-orange-500" />, title: "Treinos Dinâmicos", desc: "Envio de fichas de treino personalizadas com vídeos e dicas." },
                                    { icon: <UserCheck className="text-green-500" />, title: "Check-in via WhatsApp", desc: "O aluno avisa que chegou e recebe o QR Code de acesso na hora." },
                                    { icon: <MessageSquare className="text-blue-500" />, title: "Alertas de Renovação", desc: "Avisos automáticos de mensalidade com link direto para pagamento Pix." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4 p-4 rounded-xl hover:bg-white hover:shadow-md transition-all duration-300 border border-transparent hover:border-slate-100">
                                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
                                            <p className="text-sm text-slate-500">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <div className="inline-block px-4 py-1.5 mb-4 rounded-full bg-orange-50 text-orange-600 text-xs font-black uppercase tracking-widest border border-orange-100">
                            Poderoso & Simples
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 mb-4">Tudo sob seu controle</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto text-lg">Centralize a gestão da sua academia em um único painel intuitivo.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((f, i) => (
                            <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[100px] -z-10 group-hover:bg-orange-50 transition-colors"></div>
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                    {f.icon}
                                </div>
                                <h3 className="text-xl font-black mb-4 text-slate-800">{f.title}</h3>
                                <p className="text-slate-500 leading-relaxed font-medium">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats / Social Proof */}
            <section className="py-20 bg-black text-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-3 gap-12 text-center">
                        <div>
                            <div className="text-5xl font-black text-orange-500 mb-2">500+</div>
                            <div className="text-slate-400 font-bold uppercase tracking-widest text-sm">Academias Ativas</div>
                        </div>
                        <div>
                            <div className="text-5xl font-black text-orange-500 mb-2">150k+</div>
                            <div className="text-slate-400 font-bold uppercase tracking-widest text-sm">Alunos Gerenciados</div>
                        </div>
                        <div>
                            <div className="text-5xl font-black text-orange-500 mb-2">98%</div>
                            <div className="text-slate-400 font-bold uppercase tracking-widest text-sm">Aumento no Recadastro</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-black text-slate-900 mb-4">Escolha o seu nível</h2>
                        <p className="text-slate-500 text-lg">Preços claros, sem taxas ocultas. Comece pequeno, cresça gigante.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">

                        {loadingPlans ? (
                            <div className="col-span-3 text-center py-12">
                                <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <div className="text-orange-500 font-bold text-xl">Sincronizando planos...</div>
                            </div>
                        ) : planError ? (
                            <div className="col-span-3 text-center py-12">
                                <div className="text-red-500 font-bold mb-4">Erro ao carregar planos.</div>
                                <div className="bg-red-50 p-6 rounded-2xl text-left overflow-auto max-w-md mx-auto inline-block border border-red-200 shadow-sm">
                                    <p className="text-xs text-red-600 font-mono mb-2">Detalhes: {debugError}</p>
                                    <p className="text-xs text-slate-500 font-mono"><strong>Endpoint:</strong> {debugUrl}</p>
                                </div>
                                <p className="text-slate-400 text-sm mt-6">Aguarde alguns instantes ou entre em contato com o suporte.</p>
                            </div>
                        ) : plansQuery.length === 0 ? (
                            <div className="col-span-3 text-center py-20 bg-white rounded-3xl border border-slate-200">
                                <div className="text-slate-400 font-bold text-xl">Nenhum plano disponível para o seu país.</div>
                            </div>
                        ) : (
                            plansQuery.map((plan: any, i) => {
                                let featuresRes = plan.features;
                                if (typeof featuresRes === 'string') {
                                    try { featuresRes = JSON.parse(featuresRes); } catch (e) { featuresRes = []; }
                                }
                                if (!featuresRes) featuresRes = [];

                                return (
                                    <div key={i} className={`relative p-10 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col ${plan.popular ? 'border-orange-500 bg-white shadow-2xl scale-105 z-10' : 'border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1'}`}>
                                        {plan.popular && (
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
                                                RECOMENDADO
                                            </div>
                                        )}
                                        <div className="mb-10">
                                            <h3 className="text-2xl font-black text-slate-900 mb-4">{plan.name}</h3>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-slate-400 text-lg font-bold">R$</span>
                                                <span className="text-5xl font-black text-slate-900">{parseFloat(plan.price).toFixed(0)}</span>
                                                <span className="text-slate-400 font-bold">/mês</span>
                                            </div>
                                        </div>
                                        <ul className="space-y-5 mb-12 flex-1">
                                            {featuresRes.map((feat: string, k: number) => (
                                                <li key={k} className="flex items-start gap-3 text-slate-600 font-medium leading-tight">
                                                    <div className="mt-1 w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                                                        <CheckCircle size={14} className="text-green-500" />
                                                    </div>
                                                    {feat}
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            onClick={() => navigate(`/register?plan=${plan.id}`)}
                                            className={`w-full py-5 rounded-2xl font-black transition-all transform active:scale-95 ${plan.popular ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-xl shadow-orange-500/20' : 'bg-slate-900 text-white hover:bg-black'}`}
                                        >
                                            COMEÇAR AGORA
                                        </button>
                                    </div>
                                );
                            })
                        )}

                    </div>

                    <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-8 px-8 py-6 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-3xl mx-auto">
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map(i => (
                                <img key={i} src={`https://i.pravatar.cc/100?u=${i}`} className="w-12 h-12 rounded-full border-4 border-white object-cover" alt="User" />
                            ))}
                        </div>
                        <div className="text-center md:text-left">
                            <div className="flex justify-center md:justify-start gap-1 mb-1">
                                {[1, 2, 3, 4, 5].map(i => <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />)}
                            </div>
                            <p className="text-slate-600 font-bold">Aprovado por +2.000 donos de academia no Brasil.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-950 text-slate-300 py-20 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center shadow-2xl shadow-orange-500/30">
                                <Zap className="text-white fill-white" size={24} />
                            </div>
                            <span className="text-3xl font-black tracking-tighter text-white">
                                Zapp<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Fitness</span>
                            </span>
                        </div>
                        <p className="max-w-md text-slate-400 mb-8 text-lg leading-relaxed">
                            Nossa missão é democratizar a tecnologia de ponta para todas as academias do Brasil,
                            eliminando a burocracia e aproximando alunos de seus resultados.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all duration-300 hover:-translate-y-1"><Instagram size={24} /></a>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-black text-white mb-6 uppercase tracking-widest text-sm">Plataforma</h4>
                        <ul className="space-y-4 font-medium text-slate-400">
                            <li><a href="#features" className="hover:text-orange-500 transition-colors">Funcionalidades</a></li>
                            <li><a href="#pricing" className="hover:text-orange-500 transition-colors">Planos e Preços</a></li>
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Cases de Sucesso</a></li>
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Central de Ajuda</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-black text-white mb-6 uppercase tracking-widest text-sm">Empresa</h4>
                        <ul className="space-y-4 font-medium text-slate-400">
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Sobre Nós</a></li>
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Termos de Uso</a></li>
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Privacidade</a></li>
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Contato</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-white/5 text-center">
                    <p className="text-slate-500 font-bold">&copy; 2025 ZapFitness Tecnologia. Desenvolvido com ❤️ para apaixonados por esporte.</p>
                </div>
            </footer>
        </div>
    );
};
