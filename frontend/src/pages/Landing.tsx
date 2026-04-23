import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, CheckCircle2, PieChart, Target, Shield, Zap, TrendingUp, BarChart3, Sparkles
} from 'lucide-react';
import { Logo } from '../components/Logo';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="hidden sm:flex items-center gap-2">
            <Link to="/login" className="btn-ghost" data-testid="nav-login">Entrar</Link>
            <Link to="/register" className="btn-primary" data-testid="nav-register">
              Começar grátis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <Link to="/register" className="sm:hidden btn-primary !px-4">Grátis</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              'radial-gradient(1000px 500px at 50% -10%, rgba(37,99,235,0.18), transparent), radial-gradient(800px 400px at 90% 10%, rgba(124,58,237,0.18), transparent), radial-gradient(600px 300px at 10% 40%, rgba(34,197,94,0.15), transparent)',
          }}
        />
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="chip bg-brand-blue/10 text-brand-blue mb-5 border border-brand-blue/20">
              <Sparkles className="w-3.5 h-3.5" /> Novo · v1.0
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold leading-[1.05] tracking-tight">
              Controle suas finanças como um{' '}
              <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-green bg-clip-text text-transparent">PRO</span> 💰
            </h1>
            <p className="mt-5 text-lg text-slate-600 max-w-xl">
              Organize gastos, economize mais e alcance seus objetivos com um painel premium, insights inteligentes e metas que realmente funcionam.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary !px-7 !py-3.5 text-base" data-testid="hero-cta-register">
                Começar grátis <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/login" className="btn-outline !px-7 !py-3.5 text-base" data-testid="hero-cta-login">
                Já tenho conta
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
              {['Sem cartão de crédito', 'Dados criptografados', 'Cancele quando quiser'].map((t) => (
                <div key={t} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-green" /> {t}</div>
              ))}
            </div>
          </motion.div>

          {/* Hero dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -inset-8 bg-gradient-to-br from-brand-blue/30 via-brand-purple/30 to-brand-green/30 blur-3xl rounded-full opacity-60" />
            <div className="relative card !p-6 bg-white/90 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Saldo total</div>
                  <div className="text-3xl font-bold font-display mt-1">R$ 12.430,80</div>
                </div>
                <div className="chip bg-brand-green/10 text-brand-green border border-brand-green/30">
                  <TrendingUp className="w-3.5 h-3.5" /> +18%
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { label: 'Receitas', value: 'R$ 10,3k', color: 'from-green-500 to-emerald-500' },
                  { label: 'Despesas', value: 'R$ 4,1k', color: 'from-rose-500 to-red-500' },
                  { label: 'Metas', value: 'R$ 6,0k', color: 'from-brand-blue to-brand-purple' },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl bg-slate-50 p-3">
                    <div className={`h-1 rounded-full bg-gradient-to-r ${c.color} mb-2`} />
                    <div className="text-xs text-slate-500">{c.label}</div>
                    <div className="font-bold">{c.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-36 flex items-end gap-1.5">
                {[40, 62, 50, 78, 55, 84, 70, 92, 66, 88, 75, 95].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-brand-blue to-brand-purple opacity-90"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-display font-bold">Tudo que você precisa para dominar seu dinheiro</h2>
            <p className="mt-3 text-slate-600">Um painel premium com as ferramentas certas — sem complicação.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BarChart3, title: 'Dashboard Inteligente', desc: 'Gráficos mensais, categorias e tendências em tempo real.' },
              { icon: Target, title: 'Metas Visuais', desc: 'Acompanhe o progresso com barras animadas e previsões.' },
              { icon: PieChart, title: 'Insights por IA', desc: 'Dicas automáticas quando você gasta demais ou poupa bem.' },
              { icon: Shield, title: 'Segurança Premium', desc: 'Senha criptografada com bcrypt e autenticação JWT.' },
              { icon: Zap, title: 'Exportação', desc: 'Baixe relatórios em PDF e Excel com 1 clique.' },
              { icon: TrendingUp, title: 'Painel Admin', desc: 'Gestão completa de usuários e estatísticas globais.' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card hover:shadow-glow hover:-translate-y-1 transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white mb-4">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg">{f.title}</h3>
                <p className="text-slate-600 mt-1 text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div
            className="relative rounded-3xl overflow-hidden p-10 sm:p-14 text-center text-white"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #22C55E 120%)' }}
          >
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><circle cx='60' cy='60' r='1.5' fill='white'/></svg>\")" }} />
            <h2 className="relative text-3xl sm:text-4xl font-display font-extrabold">Seu dinheiro sob controle.</h2>
            <p className="relative mt-3 text-white/90 max-w-lg mx-auto">Pare de perder dinheiro sem perceber. Transforme seus gastos em resultados hoje mesmo.</p>
            <Link to="/register" className="relative mt-7 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold bg-white text-brand-dark hover:bg-slate-100 transition" data-testid="cta-register">
              Começar grátis <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size={28} />
          <div className="text-sm text-slate-500">© {new Date().getFullYear()} Finix · Suas finanças, seu futuro.</div>
        </div>
      </footer>
    </div>
  );
}
