
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Zap, Shield, Smartphone, ArrowRight, Instagram } from 'lucide-react';

export const LandingPage = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [plansQuery, setPlansQuery] = useState<any[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [planError, setPlanError] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);

        const fetchPlans = async () => {
            try {
                // Determine API URL (using Vite Proxy in dev, absolute in prod if configured, or relative)
                // In production static build, we need absolute URL if backend is on different domain.
                // The api.ts logic handles this for axios, but here we used fetch. 
                // Let's use relative path '/api/saas/plans', hoping proxy or same-domain works.
                // Or better, import the configured 'api' instance? 
                // Using fetch for simplicity in Landing Page, but 'api' instance is safer for baseURL.
                // But for now, let's stick to fetch relative, assuming proxy or domain matches.
                // Actually, for Shared Host, we rely on VITE_API_URL in .env.production.
                // Fetch needs full URL if on different domain.
                // Let's use the 'api' instance from ../api.ts? No, I'll allow fetch but use import.meta.env logic if needed?
                // Use relative '/api...' works if proxied. On shared host without proxy, it fails unless configured.
                // Wait, earlier I said Shared Host needs VITE_API_URL.
                // The 'api' instance in 'src/api.ts' handles baseURL.
                // Let's use 'api.get' instead of 'fetch' to be consistent and SAFE!

                // Switching to 'api' import would require importing 'api' from '../api'.
                // Let's DO THAT. It is much better.
            } catch (e) { }
        };
        // Actually, let's keep fetch for now to match imports, BUT use full URL if env var is set?
        // Let's just use fetch('/api/...') and assume the .htaccess or domain setup handles it?
        // No, fetch('/api/...') on shared host (static) requests file '/api/...'.
        // It WON'T hit the backend unless backend IS the host.
        // I MUST use the full URL.
        const baseUrl = import.meta.env.VITE_API_URL || '';
        // If VITE_API_URL is defined, use it. Else relative.

        const url = `${baseUrl}/api/saas/plans`.replace('//api', '/api'); // Prevent double slash if base has /api

        fetch(url).then(async (res) => {
            if (!res.ok) throw new Error('Network response was not ok');
            const data = await res.json();
            if (Array.isArray(data)) setPlansQuery(data);
        }).catch(err => {
            console.error(err);
            setPlanError(true);
        }).finally(() => {
            setLoadingPlans(false);
        });

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        { icon: <Zap className="text-orange-500" />, title: "Automação via WhatsApp", desc: "Seu aluno pede treino, dieta e faz check-in direto pelo Whats, sem baixar apps." },
        { icon: <CheckCircle className="text-green-500" />, title: "Check-in Inteligente", desc: "Controle de acesso por QR Code com validação instantânea de pagamentos e horários." },
        { icon: <Shield className="text-blue-500" />, title: "Gestão Financeira", desc: "Bloqueio automático de inadimplentes e controle total de planos e renovações." },
        { icon: <Smartphone className="text-purple-500" />, title: "App do Aluno (Sem App)", desc: "Tudo acontece no chat que eles já usam todo dia. Engajamento máximo." }
    ];

    return (
        <div className="font-sans antialiased text-slate-800 bg-white">
            {/* Navbar */}
            <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-black/90 backdrop-blur-md py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/50 backdrop-blur-sm">
                            <Zap className="text-primary fill-current" size={24} />
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight">Zap<span className="text-primary">Fitness</span></span>
                    </div>
                    <div className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
                        <a href="#features" className="hover:text-white transition">Funcionalidades</a>
                        <a href="#pricing" className="hover:text-white transition">Planos</a>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => navigate('/login')} className="text-white hover:text-primary transition font-medium">Entrar</button>
                        <button onClick={() => navigate('/register')} className="bg-primary hover:bg-orange-600 text-white px-6 py-2.5 rounded-full font-bold transition shadow-lg shadow-primary/30 hover:shadow-primary/50 transform hover:-translate-y-0.5">
                            Começar Agora
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-black text-white">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-black to-black opacity-50"></div>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>

                <div className="relative max-w-7xl mx-auto px-6 text-center z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-md mb-8 animate-fade-in">
                        <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Sistema de Gestão #1 para Academias</span>
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                        Gerencie sua Academia <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Pelo WhatsApp</span>
                    </h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Esqueça catracas caras e apps que ninguém baixa. Use a ferramenta que todo mundo já tem para automatizar treinos, pagamentos e acesso.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button onClick={() => navigate('/register')} className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-200 transition flex items-center justify-center gap-2 group">
                            Criar Conta Grátis
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button className="px-8 py-4 rounded-full font-bold text-lg border border-slate-700 hover:bg-slate-800/50 backdrop-blur-md transition text-white">
                            Ver Demonstração
                        </button>
                    </div>
                    <div className="mt-16 text-sm text-slate-500 font-medium">
                        Já confiam na ZapFitness:
                        <div className="flex justify-center gap-8 mt-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                            <div className="text-xl font-black text-white">IRON<span className="font-light">GYM</span></div>
                            <div className="text-xl font-black text-white">CROSS<span className="text-primary">X</span></div>
                            <div className="text-xl font-black text-white">SMART<span className="text-blue-400">FIT</span></div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Tudo o que você precisa</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto">Automatize processos chatos e foque no que importa: seus alunos.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((f, i) => (
                            <div key={i} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition duration-300 border border-slate-100 group">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    {f.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-slate-800">{f.title}</h3>
                                <p className="text-slate-500 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Planos Simples e Transparentes</h2>
                        <p className="text-slate-600">Escolha o melhor para o seu momento. Cancele quando quiser.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">

                        {loadingPlans ? (
                            <div className="col-span-3 text-center py-12">
                                <div className="text-orange-500 font-bold text-xl animate-pulse">Carregando planos...</div>
                            </div>
                        ) : planError ? (
                            <div className="col-span-3 text-center py-12">
                                <div className="text-red-500 font-bold mb-2">Não foi possível carregar os planos.</div>
                                <p className="text-slate-500 text-sm">Verifique sua conexão (API Offline ou Erro SSL).</p>
                            </div>
                        ) : plansQuery.length === 0 ? (
                            <div className="col-span-3 text-center py-12">
                                <div className="text-slate-500 font-bold">Nenhum plano disponível no momento.</div>
                            </div>
                        ) : (
                            plansQuery.map((plan: any, i) => {
                                let features = plan.features;
                                if (typeof features === 'string') {
                                    try { features = JSON.parse(features); } catch (e) { features = []; }
                                }
                                if (!features) features = [];

                                return (
                                    <div key={i} className={`relative p-8 rounded-2xl border ${plan.popular ? 'border-primary bg-slate-50 shadow-xl scale-105 z-10' : 'border-slate-200 bg-white shadow-sm'} flex flex-col`}>
                                        {plan.popular && (
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                                                Mais Popular
                                            </div>
                                        )}
                                        <div className="mb-6">
                                            <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
                                            <div className="mt-4 flex items-baseline">
                                                <span className="text-4xl font-extrabold text-slate-900">R$ {parseFloat(plan.price).toFixed(0)}</span>
                                                <span className="text-slate-500 ml-1">/mês</span>
                                            </div>
                                        </div>
                                        <ul className="space-y-4 mb-8 flex-1">
                                            {features.map((feat: string, k: number) => (
                                                <li key={k} className="flex items-start gap-4 text-sm text-slate-600">
                                                    <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                                                    {feat}
                                                </li>
                                            ))}
                                        </ul>
                                        <button onClick={() => navigate(`/register?plan=${plan.id}`)} className={`w-full py-3 rounded-lg font-bold transition ${plan.popular ? 'bg-primary text-white hover:bg-orange-600 shadow-lg' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>
                                            Escolher {plan.name}
                                        </button>
                                    </div>
                                );
                            })
                        )}

                    </div>

                    <div className="mt-12 text-center text-slate-500 text-sm">
                        <p className="mb-2">Pagamento seguro via <strong>Cartão de Crédito</strong> ou <strong>Pix</strong>.</p>
                        <p>Precisa de um plano personalizado? <a href="#" className="text-primary font-bold hover:underline">Fale com vendas</a>.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white">Z</div>
                            <span className="text-xl font-bold text-white">ZapFitness</span>
                        </div>
                        <p className="max-w-xs text-slate-500 mb-6">A revolução na gestão de academias. Simples, rápido e direto no WhatsApp.</p>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition"><Instagram size={20} /></a>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4">Produto</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-primary transition">Funcionalidades</a></li>
                            <li><a href="#" className="hover:text-primary transition">Preços</a></li>
                            <li><a href="#" className="hover:text-primary transition">Atualizações</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="hover:text-primary transition">Termos de Uso</a></li>
                            <li><a href="#" className="hover:text-primary transition">Privacidade</a></li>
                            <li><a href="#" className="hover:text-primary transition">Suporte</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-800/50 text-center text-xs text-slate-600">
                    &copy; 2025 ZapFitness Tecnologia. Todos os direitos reservados.
                </div>
            </footer>
        </div>
    );
};
