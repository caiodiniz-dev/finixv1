import React, { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, PiggyBank, FileDown, FileSpreadsheet,
  ArrowUpRight, ArrowDownRight, Info, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import { api } from '../services/api';
import { DashboardData } from '../types';
import { currency, dateBR, CATEGORY_COLORS } from '../utils/format';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then((r) => setData(r.data)).catch(() => toast.error('Erro ao carregar')).finally(() => setLoading(false));
  }, []);

  const handleExport = async (kind: 'pdf' | 'excel') => {
    try {
      const r = await api.get(`/export/${kind}`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = kind === 'pdf' ? 'finix-relatorio.pdf' : 'finix-transacoes.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exportado!');
    } catch { toast.error('Erro ao exportar'); }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-32" />)}
        </div>
        <div className="skeleton h-80" />
      </div>
    );
  }

  const stats = [
    { label: 'Saldo total', value: data.balance, icon: Wallet, color: 'from-brand-blue to-brand-purple', positive: data.balance >= 0 },
    { label: 'Receitas', value: data.income, icon: TrendingUp, color: 'from-emerald-500 to-green-500', positive: true },
    { label: 'Despesas', value: data.expense, icon: TrendingDown, color: 'from-rose-500 to-red-500', positive: false, isExp: true },
    { label: 'Economizado', value: data.saved, icon: PiggyBank, color: 'from-amber-500 to-orange-500', positive: true },
  ];

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Acompanhe seu progresso financeiro</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('pdf')} className="btn-outline" data-testid="export-pdf">
            <FileDown className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => handleExport('excel')} className="btn-outline" data-testid="export-excel">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${s.color} opacity-10 blur-2xl`} />
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{s.label}</div>
                <div className="text-2xl font-display font-bold mt-2" data-testid={`stat-${s.label}`}>{currency(s.value)}</div>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-md`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Insights */}
      {data.insights.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.insights.map((ins, i) => {
            const cfg = {
              info: { icon: Info, cls: 'border-blue-200 bg-blue-50 text-blue-900' },
              warning: { icon: AlertTriangle, cls: 'border-amber-200 bg-amber-50 text-amber-900' },
              success: { icon: CheckCircle2, cls: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
            }[ins.type];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border p-4 ${cfg.cls}`}
              >
                <div className="flex gap-3">
                  <cfg.icon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-sm">{ins.title}</div>
                    <div className="text-xs opacity-90 mt-0.5">{ins.message}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h3 className="font-display font-bold">Fluxo mensal</h3>
          <p className="text-xs text-slate-500">Receitas vs Despesas nos últimos 6 meses</p>
          <div className="h-72 mt-4">
            <ResponsiveContainer>
              <AreaChart data={data.monthly}>
                <defs>
                  <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: any) => currency(Number(v))}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0' }}
                />
                <Area type="monotone" dataKey="income" stroke="#22C55E" fill="url(#inc)" strokeWidth={2.5} name="Receitas" />
                <Area type="monotone" dataKey="expense" stroke="#EF4444" fill="url(#exp)" strokeWidth={2.5} name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display font-bold">Gastos por categoria</h3>
          <p className="text-xs text-slate-500">Distribuição atual</p>
          <div className="h-72 mt-4">
            {data.categories.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados ainda</div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data.categories} dataKey="amount" nameKey="category"
                    cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}
                  >
                    {data.categories.map((c, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[c.category] || '#64748B'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => currency(Number(v))} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <h3 className="font-display font-bold">Comparativo mensal</h3>
          <div className="h-64 mt-4">
            <ResponsiveContainer>
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} />
                <YAxis stroke="#94A3B8" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => currency(Number(v))} contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="income" fill="#22C55E" radius={[8,8,0,0]} name="Receitas" />
                <Bar dataKey="expense" fill="#7C3AED" radius={[8,8,0,0]} name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display font-bold">Últimas transações</h3>
          <div className="mt-4 space-y-2" data-testid="recent-transactions">
            {data.recent.length === 0 && <p className="text-sm text-slate-400">Nenhuma transação ainda</p>}
            {data.recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {t.type === 'INCOME' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{t.title}</div>
                  <div className="text-xs text-slate-500">{t.category} · {dateBR(t.date)}</div>
                </div>
                <div className={`font-bold text-sm ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === 'INCOME' ? '+' : '-'}{currency(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
