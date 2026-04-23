import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, CheckCircle2, PieChart, Target, Shield, Zap, TrendingUp, BarChart3, Sparkles,
  Wallet, FileDown, RefreshCw, Brain, LineChart, Users, Star, Quote, ChevronRight, Play,
  ShieldCheck, Lock, Clock, MousePointer2
} from 'lucide-react';
import { Logo } from '../components/Logo';

function useCountUp(to: number, duration = 1.6, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / (duration * 1000));
      setVal(Math.floor(to * (0.5 - Math.cos(Math.PI * p) / 2)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, start]);
  return val;
}

function StatCounter({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const n = useCountUp(value, 1.8, inView);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl sm:text-5xl font-display font-extrabold bg-gradient-to-br from-brand-blue via-brand-purple to-brand-green bg-clip-text text-transparent tabular-nums">
        {n.toLocaleString('pt-BR')}{suffix}
      </div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  );
}

export default function Landing() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0.2]);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Top progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-blue via-brand-purple to-brand-green origin-left z-50"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Logo />
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#features" className="hover:text-brand-blue transition">Recursos</a>
            <a href="#preview" className="hover:text-brand-blue transition">Preview</a>
            <a href="#testimonials" className="hover:text-brand-blue transition">Depoimentos</a>
            <a href="#pricing" className="hover:text-brand-blue transition">Preço</a>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost hidden sm:inline-flex" data-testid="nav-login">Entrar</Link>
            <Link to="/register" className="btn-primary" data-testid="nav-register">
              Começar grátis <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Ambient orbs */}
        <motion.div
          className="absolute -top-32 -left-32 w-[38rem] h-[38rem] rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, #2563EB, transparent 60%)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.35, 0.25] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-10 -right-32 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-30"
          style={{ background: 'radial-gradient(circle, #7C3AED, transparent 60%)' }}
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.35, 0.25, 0.35] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-1/3 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-25"
          style={{ background: 'radial-gradient(circle, #22C55E, transparent 60%)' }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative max-w-7xl mx-auto px-6 pt-24 pb-32 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="chip bg-gradient-to-r from-brand-blue/10 to-brand-purple/10 text-brand-blue mb-5 border border-brand-blue/20 backdrop-blur"
            >
              <Sparkles className="w-3.5 h-3.5" /> Agora com IA · Claude Sonnet 4.5
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold leading-[1.05] tracking-tight"
            >
              Controle suas finanças como um{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-green bg-clip-text text-transparent">PRO</span>
                <motion.span
                  initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ delay: 0.8, duration: 0.6 }}
                  className="absolute -bottom-1 left-0 h-1 bg-gradient-to-r from-brand-blue via-brand-purple to-brand-green rounded-full"
                />
              </span>{' '}💰
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
              className="mt-5 text-lg text-slate-600 max-w-xl leading-relaxed"
            >
              Organize gastos, economize mais e alcance seus objetivos com um painel premium, insights inteligentes por IA e metas que realmente funcionam.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link to="/register" className="btn-primary !px-7 !py-3.5 text-base group" data-testid="hero-cta-register">
                Começar grátis
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#preview" className="btn-outline !px-7 !py-3.5 text-base group">
                <Play className="w-4 h-4 group-hover:scale-110 transition" /> Ver demonstração
              </a>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 flex flex-wrap items-center gap-5 text-sm text-slate-500">
              {[
                { icon: CheckCircle2, text: 'Sem cartão de crédito' },
                { icon: ShieldCheck, text: 'Criptografia bcrypt + JWT' },
                { icon: Clock, text: 'Configure em 1 minuto' },
              ].map((t) => (
                <div key={t.text} className="flex items-center gap-1.5"><t.icon className="w-4 h-4 text-brand-green" /> {t.text}</div>
              ))}
            </motion.div>

            {/* Avatars social proof */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2">
                {['#F59E0B', '#2563EB', '#7C3AED', '#22C55E', '#EC4899'].map((c, i) => (
                  <div key={i} className="w-9 h-9 rounded-full ring-2 ring-white flex items-center justify-center text-white font-bold text-xs" style={{ background: c }}>
                    {['R','M','A','L','C'][i]}
                  </div>
                ))}
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-1 text-amber-500">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                </div>
                <p className="text-slate-600 font-medium">+4.000 pessoas no controle</p>
              </div>
            </motion.div>
          </div>

          {/* Hero dashboard preview */}
          <HeroDashboard />
        </motion.div>
      </section>

      {/* Counters strip */}
      <section className="border-y border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCounter value={4230} label="Usuários ativos" />
          <StatCounter value={128000} label="Transações gerenciadas" suffix="+" />
          <StatCounter value={98} label="Satisfação" suffix="%" />
          <StatCounter value={25} label="Categorias prontas" suffix="+" />
        </div>
      </section>

      {/* Feature cards */}
      <section id="features" className="py-24 bg-gradient-to-b from-white via-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="chip bg-brand-purple/10 text-brand-purple mb-3 mx-auto border border-brand-purple/20">Recursos</div>
            <h2 className="text-3xl sm:text-5xl font-display font-extrabold tracking-tight">
              Tudo que você precisa para <span className="text-brand-blue">dominar seu dinheiro</span>
            </h2>
            <p className="mt-4 text-slate-600 text-lg">Um painel premium com as ferramentas certas — sem complicação.</p>
          </motion.div>
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, title: 'Dashboard Inteligente', desc: 'Gráficos de área, pizza e barras em tempo real com dados dos últimos 6 meses.', gradient: 'from-brand-blue to-cyan-500' },
              { icon: Brain, title: 'Insights com IA real', desc: 'Claude Sonnet 4.5 analisa seus gastos e dá conselhos personalizados em segundos.', gradient: 'from-brand-purple to-pink-500' },
              { icon: Target, title: 'Metas Visuais', desc: 'Acompanhe o progresso com barras animadas e previsão de conclusão automática.', gradient: 'from-brand-green to-emerald-500' },
              { icon: Wallet, title: 'Orçamentos por categoria', desc: 'Defina limites mensais e receba alertas quando ultrapassar 80% ou 100%.', gradient: 'from-amber-500 to-orange-500' },
              { icon: RefreshCw, title: 'Recorrências', desc: 'Marque transações como mensais, semanais ou anuais. Salário, aluguel, assinaturas.', gradient: 'from-cyan-500 to-brand-blue' },
              { icon: FileDown, title: 'Exportação', desc: 'Baixe relatórios em PDF estilizado ou Excel com 1 clique.', gradient: 'from-rose-500 to-pink-500' },
              { icon: Shield, title: 'Painel Admin', desc: 'Gestão completa de usuários, roles, bloqueio e estatísticas globais.', gradient: 'from-slate-700 to-slate-900' },
              { icon: Lock, title: 'Segurança Premium', desc: 'Senha com bcrypt, JWT stateless, dados por usuário. Zero trust.', gradient: 'from-red-500 to-rose-600' },
              { icon: Zap, title: 'Dark Mode', desc: 'Alterne entre claro e escuro com 1 clique. Interface 100% responsiva.', gradient: 'from-violet-500 to-brand-purple' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -6 }}
                className="group relative card hover:shadow-glow transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-md`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-bold text-lg">{f.title}</h3>
                <p className="text-slate-600 mt-2 text-sm leading-relaxed">{f.desc}</p>
                <ChevronRight className="absolute bottom-5 right-5 w-5 h-5 text-slate-300 group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Product preview showcase */}
      <section id="preview" className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <div className="chip bg-brand-green/10 text-brand-green mb-3 mx-auto border border-brand-green/20">Preview</div>
            <h2 className="text-3xl sm:text-5xl font-display font-extrabold tracking-tight">Veja o Finix em ação</h2>
            <p className="mt-4 text-slate-600 text-lg">Cada pixel foi pensado pra você tomar decisões melhores.</p>
          </motion.div>

          <PreviewCard
            order={1}
            badge="Dashboard"
            title="Seu panorama financeiro em 1 olhada"
            desc="Saldo, receitas, despesas, economizado, insights e 3 gráficos com zoom nos últimos 6 meses."
            align="left"
            visual={<DashboardVisual />}
          />
          <PreviewCard
            order={2}
            badge="IA · Claude Sonnet 4.5"
            title="Análise personalizada em segundos"
            desc="Clique em 'Análise com IA' e receba 4-6 recomendações específicas com base nos seus números reais."
            align="right"
            visual={<AIInsightsVisual />}
          />
          <PreviewCard
            order={3}
            badge="Metas + Orçamentos"
            title="Transforme desejos em planos concretos"
            desc="Defina objetivos, acompanhe o progresso com barras animadas e limite gastos por categoria."
            align="left"
            visual={<GoalsVisual />}
          />
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <div className="chip bg-amber-100 text-amber-700 mb-3 mx-auto border border-amber-200">Depoimentos</div>
            <h2 className="text-3xl sm:text-5xl font-display font-extrabold tracking-tight">Pessoas que <span className="text-brand-green">economizaram de verdade</span></h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Rafael Mendes', role: 'Designer · SP', text: 'O Finix mudou meu jogo. Em 3 meses economizei R$ 4.200 só descobrindo para onde meu dinheiro ia.', color: '#2563EB' },
              { name: 'Marina Costa', role: 'Engenheira · RJ', text: 'A análise da IA foi impressionante. Identificou que eu gastava demais com delivery e me ajudou a cortar 40%.', color: '#7C3AED' },
              { name: 'Lucas Almeida', role: 'Dev · BH', text: 'Finalmente um app de finanças bonito e rápido. Os gráficos e as metas me mantêm motivado todo mês.', color: '#22C55E' },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card relative"
              >
                <Quote className="absolute top-5 right-5 w-8 h-8 text-slate-100" />
                <div className="flex items-center gap-1 text-amber-500 mb-3">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-slate-700 leading-relaxed">"{t.text}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: t.color }}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="chip bg-brand-blue/10 text-brand-blue mb-3 mx-auto border border-brand-blue/20">Preço</div>
            <h2 className="text-3xl sm:text-5xl font-display font-extrabold tracking-tight">Grátis durante o lançamento</h2>
            <p className="mt-3 text-slate-600 text-lg">Todos os recursos sem limite. Para sempre na versão beta.</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            whileHover={{ y: -4 }}
            className="relative mt-10 card max-w-md mx-auto hover:shadow-glow transition-all"
          >
            <div className="chip bg-gradient-to-r from-brand-blue to-brand-purple text-white mx-auto mb-2">MAIS POPULAR</div>
            <div className="text-5xl font-display font-extrabold mt-4">R$ 0</div>
            <div className="text-slate-500 text-sm">/mês · enquanto durar o beta</div>
            <ul className="mt-6 space-y-3 text-left">
              {['Transações ilimitadas', 'Insights por IA', 'Orçamentos e metas', 'Exportação PDF + Excel', 'Suporte por e-mail'].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-brand-green" /> {f}</li>
              ))}
            </ul>
            <Link to="/register" className="btn-primary w-full mt-8 !py-3" data-testid="pricing-cta">
              Começar grátis <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Big CTA */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden p-12 sm:p-16 text-center text-white"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #22C55E 120%)' }}
          >
            <motion.div
              className="absolute inset-0 opacity-20"
              animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
              transition={{ duration: 12, repeat: Infinity, repeatType: 'reverse' }}
              style={{
                backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><circle cx='60' cy='60' r='1.5' fill='white'/></svg>\")",
                backgroundSize: '60px 60px',
              }}
            />
            <h2 className="relative text-3xl sm:text-5xl font-display font-extrabold">Pare de perder dinheiro sem perceber.</h2>
            <p className="relative mt-4 text-white/90 max-w-xl mx-auto text-lg">Transforme seus gastos em resultados hoje mesmo. Leva menos de 1 minuto.</p>
            <Link to="/register" className="relative mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-white text-brand-dark hover:bg-slate-100 hover:scale-105 transition text-base" data-testid="cta-register">
              Começar grátis <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="relative mt-4 text-xs text-white/70 flex items-center justify-center gap-2">
              <MousePointer2 className="w-3 h-3" /> Nenhuma informação de pagamento necessária
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-10 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size={32} />
          <div className="text-sm text-slate-500 text-center sm:text-right">
            © {new Date().getFullYear()} Finix · Suas finanças, seu futuro. Feito com 💙 no Brasil.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ===== Visual components (animated mockups) ===== */

function HeroDashboard() {
  const bars = [40, 62, 50, 78, 55, 84, 70, 92, 66, 88, 75, 95];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.8, delay: 0.2, type: 'spring', stiffness: 70 }}
      className="relative"
    >
      {/* Glow */}
      <div className="absolute -inset-8 bg-gradient-to-br from-brand-blue/30 via-brand-purple/30 to-brand-green/30 blur-3xl rounded-full opacity-60" />

      {/* Floating side card 1 */}
      <motion.div
        initial={{ opacity: 0, x: 30, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute -left-8 top-44 z-20 card !p-4 w-56 bg-white/95 backdrop-blur"
        style={{ boxShadow: '0 20px 60px -20px rgba(37,99,235,0.4)' }}
      >
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-purple to-pink-500 flex items-center justify-center text-white">
              <Brain className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold">Insight da IA</div>
          </div>
          <p className="text-xs text-slate-600 mt-2 leading-snug">Você economizou <b className="text-brand-green">62%</b> da sua renda este mês! 🎉</p>
        </motion.div>
      </motion.div>

      {/* Floating side card 2 */}
      <motion.div
        initial={{ opacity: 0, x: -30, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute -right-6 -bottom-6 z-20 card !p-4 w-52 bg-white/95 backdrop-blur"
        style={{ boxShadow: '0 20px 60px -20px rgba(34,197,94,0.4)' }}
      >
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-green to-emerald-500 flex items-center justify-center text-white">
              <Target className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold">Meta atingível</div>
          </div>
          <div className="text-xs text-slate-600 mt-1.5">Notebook novo</div>
          <div className="h-2 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '69%' }} transition={{ delay: 1.2, duration: 1.2 }} className="h-full bg-gradient-to-r from-brand-green to-emerald-500" />
          </div>
          <div className="text-[10px] text-slate-500 mt-1">R$ 5.500 / 8.000 · 69%</div>
        </motion.div>
      </motion.div>

      {/* Main dashboard card */}
      <div
        className="relative card !p-6 bg-white/95 backdrop-blur border border-white"
        style={{ boxShadow: '0 30px 80px -30px rgba(37,99,235,0.5)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo total</div>
            <div className="text-3xl font-display font-extrabold mt-1 tabular-nums">R$ 19.230,75</div>
          </div>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="chip bg-brand-green/10 text-brand-green border border-brand-green/30"
          >
            <TrendingUp className="w-3.5 h-3.5" /> +18%
          </motion.div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Receitas', value: 'R$ 31,1k', color: 'from-green-500 to-emerald-500' },
            { label: 'Despesas', value: 'R$ 11,9k', color: 'from-rose-500 to-red-500' },
            { label: 'Metas', value: 'R$ 16,0k', color: 'from-brand-blue to-brand-purple' },
          ].map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }}
              className="rounded-xl bg-slate-50 p-3"
            >
              <div className={`h-1 rounded-full bg-gradient-to-r ${c.color} mb-2`} />
              <div className="text-[10px] uppercase tracking-wider text-slate-500">{c.label}</div>
              <div className="font-bold text-sm">{c.value}</div>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 h-32 flex items-end gap-1.5">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }} animate={{ height: `${h}%` }}
              transition={{ delay: 0.3 + i * 0.04, duration: 0.6, ease: 'easeOut' }}
              className="flex-1 rounded-t-md bg-gradient-to-t from-brand-blue to-brand-purple"
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span>Nov</span><span>Dez</span><span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span>
        </div>
      </div>
    </motion.div>
  );
}

function PreviewCard({ order, badge, title, desc, align, visual }: { order: number; badge: string; title: string; desc: string; align: 'left' | 'right'; visual: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }}
      className={`grid lg:grid-cols-2 gap-12 items-center mb-24 ${align === 'right' ? 'lg:[&>*:first-child]:order-2' : ''}`}
    >
      <div>
        <div className="chip bg-brand-blue/10 text-brand-blue border border-brand-blue/20 mb-3">#{order} · {badge}</div>
        <h3 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight">{title}</h3>
        <p className="mt-4 text-slate-600 text-lg leading-relaxed">{desc}</p>
        <Link to="/register" className="inline-flex items-center gap-1 mt-5 text-brand-blue font-semibold hover:gap-2 transition-all">
          Experimente agora <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <motion.div whileHover={{ y: -4 }} className="relative">
        {visual}
      </motion.div>
    </motion.div>
  );
}

function DashboardVisual() {
  return (
    <div className="card !p-5 bg-white relative" style={{ boxShadow: '0 30px 60px -30px rgba(0,0,0,0.3)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="text-xs text-slate-400">finix.app/dashboard</div>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Saldo', v: 'R$ 19,2k', c: 'from-brand-blue to-brand-purple' },
          { label: 'Receitas', v: 'R$ 31,1k', c: 'from-green-500 to-emerald-500' },
          { label: 'Despesas', v: 'R$ 11,9k', c: 'from-rose-500 to-red-500' },
          { label: 'Economizado', v: 'R$ 16,0k', c: 'from-amber-500 to-orange-500' },
        ].map(k => (
          <div key={k.label} className="rounded-lg bg-slate-50 p-2">
            <div className={`h-0.5 rounded bg-gradient-to-r ${k.c} mb-1`} />
            <div className="text-[9px] uppercase text-slate-500">{k.label}</div>
            <div className="font-bold text-xs">{k.v}</div>
          </div>
        ))}
      </div>
      <svg viewBox="0 0 400 120" className="w-full">
        <defs>
          <linearGradient id="gLine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rLine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 1.5 }}
          d="M0 80 C 50 70, 90 40, 150 45 S 250 20, 320 15 L 400 10 L 400 120 L 0 120 Z"
          fill="url(#gLine)" stroke="#22C55E" strokeWidth="2"
        />
        <motion.path
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
          transition={{ duration: 1.5, delay: 0.3 }}
          d="M0 100 C 60 95, 100 85, 170 88 S 270 70, 340 65 L 400 62 L 400 120 L 0 120 Z"
          fill="url(#rLine)" stroke="#EF4444" strokeWidth="2"
        />
      </svg>
    </div>
  );
}

function AIInsightsVisual() {
  const items = [
    { t: 'success', title: 'Excelente controle! 🎉', msg: 'Você economizou 62% da sua renda. Continue assim!' },
    { t: 'warning', title: 'Atenção: Moradia', msg: 'Representa 67% dos gastos. Reavalie se possível.' },
    { t: 'info', title: 'Meta próxima 🎯', msg: 'Notebook 69% concluído. Faltam R$ 2.500.' },
    { t: 'success', title: 'Saldo saudável 💰', msg: 'R$ 19k é 62% da receita total. Ótima gestão.' },
  ];
  const colors: any = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
  };
  return (
    <div
      className="relative rounded-2xl p-5 border border-brand-purple/20"
      style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.12) 50%, rgba(34,197,94,0.08) 100%)', boxShadow: '0 30px 60px -30px rgba(124,58,237,0.4)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white shadow-glow">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-sm">Análise com IA</div>
          <div className="text-[10px] text-slate-500">Claude Sonnet 4.5 · gerado agora</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((i, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: idx * 0.15 }}
            className={`rounded-lg border p-2.5 ${colors[i.t]}`}
          >
            <div className="font-semibold text-[11px]">{i.title}</div>
            <div className="text-[10px] opacity-80 mt-0.5 leading-snug">{i.msg}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function GoalsVisual() {
  const goals = [
    { t: 'Reserva de emergência', pct: 41, cur: 'R$ 6.200', tgt: 'R$ 15.000', c: 'from-brand-blue to-brand-purple' },
    { t: 'Viagem Europa', pct: 17, cur: 'R$ 4.300', tgt: 'R$ 25.000', c: 'from-brand-purple to-pink-500' },
    { t: 'Notebook novo', pct: 69, cur: 'R$ 5.500', tgt: 'R$ 8.000', c: 'from-brand-green to-emerald-500' },
  ];
  return (
    <div className="card !p-5 space-y-3" style={{ boxShadow: '0 30px 60px -30px rgba(0,0,0,0.3)' }}>
      {goals.map((g, i) => (
        <motion.div
          key={g.t}
          initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
          transition={{ delay: i * 0.15 }}
          className="rounded-xl border border-slate-100 p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-brand-blue" />
              <span className="font-semibold text-sm">{g.t}</span>
            </div>
            <span className="text-xs font-bold text-brand-blue">{g.pct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
            <motion.div
              initial={{ width: 0 }} whileInView={{ width: `${g.pct}%` }} viewport={{ once: true }}
              transition={{ duration: 1.2, delay: i * 0.15 }}
              className={`h-full rounded-full bg-gradient-to-r ${g.c}`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>{g.cur}</span><span>de {g.tgt}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
