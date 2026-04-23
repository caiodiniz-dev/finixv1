import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import { User as UserIcon, Mail, Lock, Save, Loader2, Shield, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, apiErrorMessage } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { dateBR } from '../utils/format';

const nameSchema = yup.object({ name: yup.string().min(2).required() });
const pwSchema = yup.object({
  currentPassword: yup.string().required('Informe a senha atual'),
  newPassword: yup.string().min(6, 'Mínimo 6 caracteres').required(),
});

export default function Profile() {
  const { user } = useAuth();
  if (!user) return null;

  const nameForm = useForm<{ name: string }>({
    resolver: yupResolver(nameSchema) as any,
    defaultValues: { name: user.name },
  });
  const pwForm = useForm<{ currentPassword: string; newPassword: string }>({
    resolver: yupResolver(pwSchema) as any,
  });

  const onSaveName = async (data: { name: string }) => {
    try {
      await api.put('/profile', { name: data.name });
      toast.success('Nome atualizado! Recarregando...');
      setTimeout(() => window.location.reload(), 800);
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const onChangePw = async (data: { currentPassword: string; newPassword: string }) => {
    try {
      await api.put('/profile', data);
      toast.success('Senha alterada!');
      pwForm.reset();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  return (
    <div className="space-y-6" data-testid="profile-page">
      <div>
        <h1 className="text-3xl font-display font-extrabold tracking-tight">Perfil</h1>
        <p className="text-slate-500 mt-1">Gerencie sua conta</p>
      </div>

      {/* Identity card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white font-display font-extrabold text-3xl shadow-glow">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-2xl">{user.name}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-1">
              <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {user.email}</span>
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> {user.role}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> desde {dateBR(user.createdAt)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="card">
          <h3 className="font-display font-bold text-lg flex items-center gap-2"><UserIcon className="w-5 h-5 text-brand-blue" /> Informações pessoais</h3>
          <form onSubmit={nameForm.handleSubmit(onSaveName)} className="mt-4 space-y-3" data-testid="name-form">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <input {...nameForm.register('name')} className="input mt-1" data-testid="profile-name" />
              {nameForm.formState.errors.name && <p className="text-xs text-red-500 mt-1">{nameForm.formState.errors.name.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">E-mail</label>
              <input value={user.email} disabled className="input mt-1 bg-slate-50 dark:bg-slate-800 cursor-not-allowed" />
              <p className="text-xs text-slate-500 mt-1">O e-mail não pode ser alterado.</p>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={nameForm.formState.isSubmitting} data-testid="save-name">
              {nameForm.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Salvar nome</>}
            </button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="card">
          <h3 className="font-display font-bold text-lg flex items-center gap-2"><Lock className="w-5 h-5 text-brand-purple" /> Alterar senha</h3>
          <form onSubmit={pwForm.handleSubmit(onChangePw)} className="mt-4 space-y-3" data-testid="password-form">
            <div>
              <label className="text-sm font-medium">Senha atual</label>
              <input type="password" {...pwForm.register('currentPassword')} className="input mt-1" data-testid="current-password" />
              {pwForm.formState.errors.currentPassword && <p className="text-xs text-red-500 mt-1">{pwForm.formState.errors.currentPassword.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium">Nova senha</label>
              <input type="password" {...pwForm.register('newPassword')} className="input mt-1" data-testid="new-password" />
              {pwForm.formState.errors.newPassword && <p className="text-xs text-red-500 mt-1">{pwForm.formState.errors.newPassword.message}</p>}
            </div>
            <button type="submit" className="btn-primary w-full" disabled={pwForm.formState.isSubmitting} data-testid="change-password">
              {pwForm.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Alterar senha</>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
