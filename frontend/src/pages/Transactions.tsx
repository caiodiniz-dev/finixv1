import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Filter, Edit2, Trash2, X, Loader2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { api, apiErrorMessage } from '../services/api';
import { Transaction } from '../types';
import { currency, dateBR, CATEGORIES, dateISOForInput } from '../utils/format';

const schema = yup.object({
  title: yup.string().min(1).required('Título obrigatório'),
  amount: yup.number().typeError('Valor inválido').positive('Valor deve ser positivo').required(),
  type: yup.string().oneOf(['INCOME', 'EXPENSE']).required(),
  category: yup.string().required('Categoria obrigatória'),
  description: yup.string().default(''),
  date: yup.string().required('Data obrigatória'),
});
type Form = yup.InferType<typeof schema>;

export default function Transactions() {
  const [items, setItems] = useState<Transaction[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [q, setQ] = useState('');
  const [type, setType] = useState<'' | 'INCOME' | 'EXPENSE'>('');
  const [category, setCategory] = useState('');

  const fetchData = async () => {
    const params: any = {};
    if (q) params.search = q;
    if (type) params.type = type;
    if (category) params.category = category;
    const r = await api.get('/transactions', { params });
    setItems(r.data);
  };

  useEffect(() => { fetchData().catch(() => toast.error('Erro ao carregar')); /* eslint-disable-next-line */ }, [q, type, category]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (t: Transaction) => { setEditing(t); setOpen(true); };

  const onDelete = async (t: Transaction) => {
    if (!window.confirm(`Excluir "${t.title}"?`)) return;
    try { await api.delete(`/transactions/${t.id}`); toast.success('Excluído'); fetchData(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">Transações</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Organize seus ganhos e gastos</p>
        </div>
        <button onClick={openNew} className="btn-primary" data-testid="new-transaction-btn">
          <Plus className="w-4 h-4" /> Nova transação
        </button>
      </div>

      {/* Filters */}
      <div className="card !p-4">
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar por nome..." className="input pl-10" data-testid="search-input"
            />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="input" data-testid="filter-type">
            <option value="">Todos os tipos</option>
            <option value="INCOME">Receitas</option>
            <option value="EXPENSE">Despesas</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input" data-testid="filter-category">
            <option value="">Todas as categorias</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="card !p-0 overflow-hidden">
        {items === null ? (
          <div className="p-8"><div className="skeleton h-16" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Filter className="w-10 h-10 mx-auto text-slate-300" />
            <p className="mt-3 font-semibold">Nenhuma transação encontrada</p>
            <p className="text-sm text-slate-500 mt-1">Clique em "Nova transação" para começar.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                data-testid={`tx-row-${t.id}`}
              >
                <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                  {t.type === 'INCOME' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{t.title}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="chip bg-slate-100 dark:bg-slate-700 !py-0.5 text-slate-600 dark:text-slate-300">{t.category}</span>
                    {dateBR(t.date)}
                  </div>
                </div>
                <div className={`font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === 'INCOME' ? '+' : '-'}{currency(t.amount)}
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost !p-2" onClick={() => openEdit(t)} data-testid={`edit-${t.id}`} title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="btn-ghost !p-2 hover:!text-red-600" onClick={() => onDelete(t)} data-testid={`delete-${t.id}`} title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <TxModal
            key={editing?.id || 'new'}
            editing={editing}
            onClose={() => setOpen(false)}
            onSaved={() => { setOpen(false); fetchData(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TxModal({ editing, onClose, onSaved }: { editing: Transaction | null; onClose: () => void; onSaved: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: yupResolver(schema),
    defaultValues: editing
      ? {
          title: editing.title,
          amount: editing.amount,
          type: editing.type,
          category: editing.category,
          description: editing.description || '',
          date: dateISOForInput(editing.date),
        }
      : { type: 'EXPENSE', category: 'Alimentação', date: dateISOForInput(), description: '' } as any,
  });

  const onSubmit = async (data: Form) => {
    try {
      const payload = { ...data, date: new Date(data.date).toISOString() };
      if (editing) await api.put(`/transactions/${editing.id}`, payload);
      else await api.post('/transactions', payload);
      toast.success(editing ? 'Atualizado' : 'Criado');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
        data-testid="tx-modal"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{editing ? 'Editar transação' : 'Nova transação'}</h2>
          <button onClick={onClose} className="btn-ghost !p-2"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-3" data-testid="tx-form">
          <div>
            <label className="text-sm font-medium">Título</label>
            <input {...register('title')} className="input mt-1" data-testid="tx-title" />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Valor (R$)</label>
              <input type="number" step="0.01" {...register('amount')} className="input mt-1" data-testid="tx-amount" />
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Data</label>
              <input type="date" {...register('date')} className="input mt-1" data-testid="tx-date" />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <select {...register('type')} className="input mt-1" data-testid="tx-type">
                <option value="EXPENSE">Despesa</option>
                <option value="INCOME">Receita</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <select {...register('category')} className="input mt-1" data-testid="tx-category">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Descrição (opcional)</label>
            <textarea {...register('description')} rows={2} className="input mt-1" data-testid="tx-description" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting} data-testid="tx-save">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
