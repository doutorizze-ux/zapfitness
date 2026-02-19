import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Shield, ArrowRight, MessageSquare, Target, UserCheck, Menu, X, Brain, Sparkles, TrendingUp } from 'lucide-react';
import { formatImageUrl } from '../utils/format';
import clsx from 'clsx';

export const LandingPage = () => {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [systemSettings, setSystemSettings] = useState({ site_name: 'ZapFitness', logo_url: '' });

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);

        const fetchSettings = async () => {
            let apiUrl = import.meta.env.VITE_API_URL || 'https://api.zapp.fitness/api';
            if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
            if (!apiUrl.endsWith('/api')) apiUrl += '/api';
            const url = `${apiUrl}/system/settings`;
            try {
                const res = await fetch(url);
                if (res.ok) setSystemSettings(await res.json());
            } catch (err) { console.error(err); }
        };

        fetchSettings();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        { icon: <Zap className="text-orange-500" />, title: "Automação via WhatsApp", desc: "Seu aluno pede treino, dieta e faz check-in direto pelo Whats, sem baixar apps." },
        { icon: <Brain className="text-primary" />, title: "IA Preditiva Anti-Abandono", desc: "O ZapFitness detecta quem está prestes a desistir e te avisa antes de acontecer." },
        { icon: <Sparkles className="text-purple-500" />, title: "Treinos com IA", desc: "Gere fichas de treino personalizadas em segundos com nossa inteligência artificial." },
        { icon: <Shield className="text-blue-500" />, title: "Gestão Financeira", desc: "Bloqueio automático de inadimplentes e controle total de planos e renovações." }
    ];

    const navLinks = [
        { label: 'Funcionalidades', href: '#features' },
        { label: 'Demonstração', href: '#demo' },
    ];

    return (
        <div className="font-sans antialiased text-slate-800 bg-white selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden">
            {/* Navbar */}
            <nav className={clsx(
                "fixed w-full z-50 transition-all duration-500 px-6",
                scrolled || mobileMenuOpen ? 'bg-black/90 backdrop-blur-xl py-4 border-b border-white/10' : 'bg-transparent py-8'
            )}>
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2 group cursor-pointer z-50" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 shadow-lg group-hover:scale-110 transition-all duration-300">
                            {systemSettings.logo_url ? (
                                <img src={formatImageUrl(systemSettings.logo_url)} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-tr from-orange-500 to-red-600 flex items-center justify-center shadow-orange-500/20">
                                    <Zap className="text-white fill-white" size={20} />
                                </div>
                            )}
                        </div>
                        <span className="text-xl md:text-2xl font-black tracking-tight text-white">
                            {systemSettings.site_name === 'ZapFitness' ? (
                                <>Zapp<span className="text-orange-500">Fitness</span></>
                            ) : (
                                systemSettings.site_name
                            )}
                        </span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex gap-8 text-sm font-bold text-slate-300">
                        {navLinks.map(link => (
                            <a key={link.href} href={link.href} className="hover:text-white transition-colors relative group py-2">
                                {link.label}
                                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-500 transition-all duration-300 group-hover:w-full"></span>
                            </a>
                        ))}
                    </div>

                    <div className="flex gap-4 items-center z-50">
                        <button onClick={() => navigate('/login')} className="text-white hover:text-orange-400 transition-colors font-bold hidden sm:block">Entrar</button>
                        <button onClick={() => navigate('/login')} className="bg-orange-500 text-white px-5 md:px-8 py-2.5 rounded-full font-black text-sm md:text-base transition-all shadow-lg shadow-orange-500/25 active:scale-95">
                            Começar
                        </button>
                        <button
                            className="md:hidden text-white p-1"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                <div className={clsx(
                    "fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center gap-10 transition-all duration-500 md:hidden",
                    mobileMenuOpen ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none -translate-y-10"
                )}>
                    {/* Close Button Inside Overlay for better UX */}
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="absolute top-8 right-8 text-white p-2 bg-white/5 rounded-full border border-white/10"
                    >
                        <X size={32} />
                    </button>

                    <div className="flex flex-col items-center gap-8">
                        {navLinks.map((link, i) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-3xl font-black text-white hover:text-orange-500 transition-all active:scale-95"
                                style={{ transitionDelay: `${i * 100}ms` }}
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>

                    <div className="flex flex-col items-center gap-6 w-full px-12 mt-10">
                        <button
                            onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                            className="w-full py-5 bg-orange-500 text-white rounded-2xl font-black text-xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
                        >
                            Entrar no Sistema
                        </button>
                        <button
                            onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}
                            className="w-full py-5 bg-white/5 text-white border border-white/10 rounded-2xl font-black text-xl active:scale-95 transition-all"
                        >
                            Criar Conta
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-40 pb-20 lg:pt-64 lg:pb-48 overflow-hidden bg-black text-white">
                {/* Visual Background */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/landing/gym-interior.png"
                        alt="High-end Gym"
                        className="w-full h-full object-cover opacity-50 mix-blend-luminosity scale-110 animate-pulse-slow"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-white"></div>
                </div>

                <div className="relative max-w-7xl mx-auto px-6 text-center z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 animate-float">
                        <span className="flex h-2 w-2 rounded-full bg-orange-500"></span>
                        <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest px-2">Gestão 100% via WhatsApp</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl lg:text-8xl font-black tracking-tighter mb-8 leading-[1.1] animate-fade-in-up">
                        Sua Academia ou <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">Consultoria no WhatsApp</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-12 leading-relaxed font-medium px-4">
                        O sistema definitivo para Academias e Personal Trainers.
                        Automatize treinos, pagamentos e check-ins pelo chat que seus alunos já usam.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4 px-4">
                        <button onClick={() => navigate('/login')} className="bg-orange-500 text-white px-10 py-5 rounded-full font-black text-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-orange-500/30">
                            QUERO COMEÇAR AGORA
                            <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform" />
                        </button>
                        <button onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })} className="px-10 py-5 rounded-full font-bold text-lg border-2 border-white/20 hover:bg-white/5 transition-all text-white flex items-center justify-center gap-2 group backdrop-blur-sm">
                            <MessageSquare size={20} />
                            Ver Demonstração
                        </button>
                    </div>

                    <div className="mt-20 pt-10 border-t border-white/10 max-w-4xl mx-auto hidden md:block">
                        <div className="flex flex-wrap justify-center items-center gap-12 grayscale opacity-40">
                            <span className="text-xl font-black text-white tracking-widest italic uppercase">IRON-GYM</span>
                            <span className="text-xl font-black text-white tracking-tight uppercase">Titan Fitness</span>
                            <span className="text-xl font-black text-white tracking-tighter italic">CROSS-CORE</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Chatbot Experience Section */}
            <section id="demo" className="py-24 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center text-center lg:text-left">
                        <div className="relative order-2 lg:order-1 px-4">
                            <div className="relative rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl border-4 md:border-8 border-slate-100 group">
                                <img
                                    src="/landing/whatsapp-bot.png"
                                    alt="WhatsApp Bot Experience"
                                    className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-8 bg-white/95 backdrop-blur-md p-4 md:p-6 rounded-2xl shadow-xl border border-white/20 text-left">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ZapFitness Aluno</span>
                                    </div>
                                    <p className="text-slate-800 font-bold text-sm md:text-base">"Olha meu treino de hoje!"</p>
                                    <p className="text-orange-600 font-black text-sm md:text-base mt-1">"Claro, João! Aqui está sua ficha de Peito e Bíceps: [Link]"</p>
                                </div>
                            </div>
                        </div>

                        <div className="order-1 lg:order-2 px-4">
                            <div className="inline-block px-4 py-1 mb-6 rounded-full bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest">Inovação</div>
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-8 leading-tight tracking-tighter">
                                Experiência <br />
                                <span className="text-orange-600">Sem Apps</span>
                            </h2>
                            <p className="text-base md:text-lg text-slate-500 mb-10 leading-relaxed font-medium">
                                Seus alunos já estão no WhatsApp o dia todo. Facilite a vida deles com um assistente virtual que faz tudo, desde liberar a catraca até enviar a dieta do dia.
                            </p>

                            <div className="space-y-4 md:space-y-6">
                                {[
                                    { icon: <Target className="text-orange-500" />, title: "Treinos na Mão", desc: "Acesso imediato às fichas de treino pelo celular." },
                                    { icon: <UserCheck className="text-green-500" />, title: "Check-in Rápido", desc: "Basta um 'cheguei' no Whats para liberar o acesso." },
                                    { icon: <MessageSquare className="text-blue-500" />, title: "Financeiro Automático", desc: "Lembretes de vencimento e pagamentos via Pix integrados." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 items-start text-left">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-1 leading-none">{item.title}</h4>
                                            <p className="text-sm text-slate-500 font-medium">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <div className="max-w-3xl mx-auto mb-20 px-4">
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Perfeito para Academias e Personal Trainers</h2>
                        <p className="text-slate-500 text-lg font-medium">Um painel administrativo para sua gestão, uma recepção ágil no WhatsApp para seu aluno.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                        {features.map((f, i) => (
                            <div key={i} className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 text-left group">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-orange-500 group-hover:text-white transition-all duration-500">
                                    <div className="group-hover:scale-110 transition-transform">
                                        {f.icon}
                                    </div>
                                </div>
                                <h3 className="text-xl font-black mb-4 text-slate-900 leading-tight">{f.title}</h3>
                                <p className="text-slate-500 leading-relaxed font-medium text-sm md:text-base">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-20 bg-slate-900 text-white text-center">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-3 gap-12">
                    <div className="col-span-1">
                        <div className="text-4xl md:text-6xl font-black text-orange-500 mb-2">500+</div>
                        <div className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Academias Ativas</div>
                    </div>
                    <div className="col-span-1">
                        <div className="text-4xl md:text-6xl font-black text-orange-500 mb-2">150k+</div>
                        <div className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Check-ins/mês</div>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <div className="text-4xl md:text-6xl font-black text-orange-500 mb-2">98%</div>
                        <div className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">Taxa de Renovação</div>
                    </div>
                </div>
            </section>

            {/* IA Section - The Wow Factor */}
            <section className="py-24 bg-slate-900 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-md">
                                <Sparkles className="text-primary animate-pulse" size={16} />
                                <span className="text-[10px] md:text-xs font-black text-primary uppercase tracking-widest">Exclusividade ZapFitness</span>
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black text-white mb-8 leading-tight tracking-tighter">
                                Uma Academia <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Gerida por Inteligência</span>
                            </h2>
                            <p className="text-lg text-slate-400 mb-10 leading-relaxed font-medium">
                                Não somos apenas um sistema de catracas. Somos o cérebro que ajuda sua academia a crescer. Nossa IA analisa o comportamento dos alunos e age por você.
                            </p>

                            <div className="space-y-6">
                                <div className="flex gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0">
                                        <TrendingUp className="text-primary" size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white mb-1">Prevenção de Abandono (Churn)</h4>
                                        <p className="text-sm text-slate-400 font-medium">O sistema identifica alunos que não aparecem há 7 dias e te sugere uma ação imediata de resgate.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0">
                                        <Brain className="text-primary" size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white mb-1">Smart Workout Generator</h4>
                                        <p className="text-sm text-slate-400 font-medium">Crie fichas de treino profissionais em 2 segundos. Nossa IA monta a rotina ideal baseada no objetivo do aluno.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full group-hover:bg-primary/30 transition-all duration-1000"></div>
                            <div className="relative bg-slate-900 border border-white/10 p-2 rounded-[3rem] shadow-2xl">
                                <img
                                    src="/landing/ai-dashboard-preview.png"
                                    alt="AI Dashboard Preview"
                                    className="w-full h-auto rounded-[2.5rem] opacity-90 group-hover:opacity-100 transition-opacity"
                                />
                                <div className="absolute -right-6 top-1/4 bg-white p-4 rounded-2xl shadow-2xl animate-float hidden md:block">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Brain className="text-primary" size={16} />
                                        <span className="text-[10px] font-black uppercase text-slate-400">Insight IA</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 whitespace-nowrap">"Recuperação de Receita: +12%"</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>



            {/* Footer */}
            <footer className="bg-slate-950 text-slate-400 py-24 border-t border-white/5">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
                    <div className="md:col-span-2">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-8">
                            <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center">
                                {systemSettings.logo_url ? (
                                    <img src={formatImageUrl(systemSettings.logo_url)} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Zap className="text-orange-500 fill-orange-500" size={32} />
                                )
                                }
                            </div>
                            <span className="text-3xl font-black tracking-tighter text-white">{systemSettings.site_name}</span>
                        </div>
                        <p className="max-w-md text-slate-500 mb-8 mx-auto md:mx-0 font-medium">
                            A tecnologia que conecta Academias e Personal Trainers ao futuro da gestão fitness. Atendimento ágil, automatizado e eficiente.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Navegação</h4>
                        <ul className="space-y-4 text-sm font-bold">
                            <li><a href="#features" className="hover:text-orange-500 transition-colors">Funcionalidades</a></li>
                            <li><a href="#demo" className="hover:text-orange-500 transition-colors">Demonstração</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Legal</h4>
                        <ul className="space-y-4 text-sm font-bold">
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Privacidade</a></li>
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Termos</a></li>
                            <li><a href="#" className="hover:text-orange-500 transition-colors">Feedback</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-20 pt-10 border-t border-white/5 text-center text-xs font-bold text-slate-600 uppercase tracking-widest">
                    &copy; 2025 {systemSettings.site_name}. Transformando academias, mudando vidas.
                </div>
            </footer>
        </div>
    );
};
