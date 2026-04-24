import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { z } from 'zod';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

dotenv.config();
process.env.DATABASE_URL ||= 'file:./dev.db';

const app = express();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() }); // For profile photo

const JWT_SECRET = process.env.JWT_SECRET || 'finix-dev-secret';
const JWT_EXPIRES_IN = '7d';
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];

app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(express.json());

// Middleware to authenticate user
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const token = auth.substring(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.blocked) {
      return res.status(401).json({ error: 'Usuário não encontrado ou bloqueado' });
    }
    (req as any).user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado (admin)' });
  }
  next();
};

// Schemas
const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const transactionSchema = z.object({
  title: z.string().min(1).max(120),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string(),
  description: z.string().optional(),
  date: z.string().transform((str) => new Date(str)),
  recurring: z.boolean().optional().default(false),
  recurringFrequency: z.enum(['monthly', 'weekly', 'yearly']).optional().nullable(),
  paymentMethod: z.enum(['credito', 'debito', 'pix']).optional().default('pix'),
  installments: z.number().min(1).max(60).optional().default(1),
  currency: z.enum(['BRL', 'USD', 'EUR', 'GBP']).optional().default('BRL'),
});

const goalSchema = z.object({
  title: z.string().min(1).max(120),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).optional().default(0),
  deadline: z.string().transform((str) => new Date(str)),
});

const budgetSchema = z.object({
  category: z.string(),
  limit: z.number().positive(),
});

const profileUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).max(128).optional(),
  photo: z.string().optional(), // base64
});

const userUpdateSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  blocked: z.boolean().optional(),
});

// Routes
app.post('/api/auth/register', async (req, res) => {
  const data = registerSchema.parse(req.body);
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return res.status(400).json({ error: 'Email já cadastrado' });
  }
  const user = await prisma.user.create({
    data: {
      id: uuidv4(),
      name: data.name.trim(),
      email: data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(data.password, 10),
    },
  });
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, blocked: user.blocked, photo: user.photo }, token });
});

app.post('/api/auth/login', async (req, res) => {
  const data = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash)) || user.blocked) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, blocked: user.blocked, photo: user.photo }, token });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = (req as any).user;
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, blocked: user.blocked, photo: user.photo });
});

// Transactions
app.get('/api/transactions', authenticate, async (req, res) => {
  const user = (req as any).user;
  const { type, category, search, startDate, endDate } = req.query;
  const where: any = { userId: user.id };
  if (type) where.type = type;
  if (category) where.category = category;
  if (search) where.title = { contains: search as string, mode: 'insensitive' };
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate as string);
    if (endDate) where.date.lte = new Date(endDate as string);
  }
  const transactions = await prisma.transaction.findMany({ where, orderBy: { date: 'desc' } });
  res.json(transactions);
});

app.post('/api/transactions', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = transactionSchema.parse(req.body);

  if (data.installments > 1) {
    // Create single transaction for installments
    const totalAmount = data.amount * data.installments; // data.amount is per installment
    const pricePerInstallment = data.amount;
    const formattedTitle = `${data.title} (Total: R$ ${totalAmount.toFixed(2)} - ${data.installments}x de R$ ${pricePerInstallment.toFixed(2)})`;

    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        id: uuidv4(),
        userId: user.id,
        title: formattedTitle,
        amount: pricePerInstallment, // Amount shown is per installment
        totalInstallments: data.installments,
        totalAmount: totalAmount,
      },
    });
    res.json(transaction);
  } else {
    const transaction = await prisma.transaction.create({
      data: { ...data, id: uuidv4(), userId: user.id },
    });
    res.json(transaction);
  }
});

app.put('/api/transactions/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = transactionSchema.parse(req.body);
  const transaction = await prisma.transaction.updateMany({
    where: { id: String(req.params.id), userId: user.id },
    data,
  });
  if (transaction.count === 0) return res.status(404).json({ error: 'Transação não encontrada' });
  const transactionId = String(req.params.id);
  const updated = await prisma.transaction.findUnique({ where: { id: transactionId } });
  res.json(updated);
});

app.delete('/api/transactions/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  const transactionId = String(req.params.id);
  const deleted = await prisma.transaction.deleteMany({ where: { id: transactionId, userId: user.id } });
  if (deleted.count === 0) return res.status(404).json({ error: 'Transação não encontrada' });
  res.json({ ok: true });
});

// Goals
app.get('/api/goals', authenticate, async (req, res) => {
  const user = (req as any).user;
  const goals = await prisma.goal.findMany({ where: { userId: user.id }, orderBy: { deadline: 'asc' } });
  res.json(goals);
});

app.post('/api/goals', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = goalSchema.parse(req.body);
  const goal = await prisma.goal.create({
    data: { ...data, id: uuidv4(), userId: user.id },
  });
  res.json(goal);
});

app.put('/api/goals/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = goalSchema.parse(req.body);
  const goal = await prisma.goal.updateMany({
    where: { id: String(req.params.id), userId: user.id },
    data,
  });
  if (goal.count === 0) return res.status(404).json({ error: 'Meta não encontrada' });
  const goalId = String(req.params.id);
  const updated = await prisma.goal.findUnique({ where: { id: goalId } });
  res.json(updated);
});

app.delete('/api/goals/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  const goalId = String(req.params.id);
  const deleted = await prisma.goal.deleteMany({ where: { id: goalId, userId: user.id } });
  if (deleted.count === 0) return res.status(404).json({ error: 'Meta não encontrada' });
  res.json({ ok: true });
});

// Budgets
app.get('/api/budgets', authenticate, async (req, res) => {
  const user = (req as any).user;
  const budgets = await prisma.budget.findMany({ where: { userId: user.id } });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id, type: 'EXPENSE', date: { gte: monthStart } },
  });
  const spentByCategory: Record<string, number> = {};
  transactions.forEach(t => {
    spentByCategory[t.category] = (spentByCategory[t.category] || 0) + t.amount;
  });
  const result = budgets.map(b => ({
    ...b,
    spent: spentByCategory[b.category] || 0,
    percentage: b.limit > 0 ? ((spentByCategory[b.category] || 0) / b.limit) * 100 : 0,
  }));
  res.json(result);
});

app.post('/api/budgets', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = budgetSchema.parse(req.body);
  try {
    const budget = await prisma.budget.create({
      data: { ...data, id: uuidv4(), userId: user.id },
    });
    res.json(budget);
  } catch (err) {
    res.status(400).json({ error: 'Já existe um orçamento para esta categoria' });
  }
});

app.put('/api/budgets/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = budgetSchema.parse(req.body);
  const budget = await prisma.budget.updateMany({
    where: { id: String(req.params.id), userId: user.id },
    data,
  });
  if (budget.count === 0) return res.status(404).json({ error: 'Orçamento não encontrado' });
  const budgetId = String(req.params.id);
  const updated = await prisma.budget.findUnique({ where: { id: budgetId } });
  res.json(updated);
});

app.delete('/api/budgets/:id', authenticate, async (req, res) => {
  const user = (req as any).user;
  const budgetId = String(req.params.id);
  const deleted = await prisma.budget.deleteMany({ where: { id: budgetId, userId: user.id } });
  if (deleted.count === 0) return res.status(404).json({ error: 'Orçamento não encontrado' });
  res.json({ ok: true });
});

// Profile
app.put('/api/profile', authenticate, async (req, res) => {
  const user = (req as any).user;
  const data = profileUpdateSchema.parse(req.body);
  const updates: any = {};
  if (data.name) updates.name = data.name.trim();
  if (data.photo) updates.photo = data.photo;
  if (data.newPassword) {
    if (!data.currentPassword || !(await bcrypt.compare(data.currentPassword, user.passwordHash))) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }
    updates.passwordHash = await bcrypt.hash(data.newPassword, 10);
  }
  if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nada para atualizar' });
  const updatedUser = await prisma.user.update({ where: { id: user.id }, data: updates });
  res.json({ id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, blocked: updatedUser.blocked, photo: updatedUser.photo });
});

// Dashboard
app.get('/api/dashboard', authenticate, async (req, res) => {
  const user = (req as any).user;
  const transactions = await prisma.transaction.findMany({ where: { userId: user.id } });
  const goals = await prisma.goal.findMany({ where: { userId: user.id } });

  const income = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
  const saved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const balance = income - expense - saved;

  // Monthly aggregation (last 6 months)
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const y = now.getFullYear();
    const m = now.getMonth() - i;
    const date = new Date(y, m < 0 ? m + 12 : m, 1);
    if (m < 0) date.setFullYear(y - 1);
    months.push(date);
  }
  const monthly = months.map(start => {
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const inc = transactions.filter(t => t.type === 'INCOME' && t.date >= start && t.date < end).reduce((sum, t) => sum + t.amount, 0);
    const exp = transactions.filter(t => t.type === 'EXPENSE' && t.date >= start && t.date < end).reduce((sum, t) => sum + t.amount, 0);
    return { month: start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), income: inc, expense: exp };
  });

  // By category
  const byCat: Record<string, number> = {};
  transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
    byCat[t.category] = (byCat[t.category] || 0) + t.amount;
  });
  const categories = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount }));

  // Insights
  const insights = [];
  if (monthly.length >= 2) {
    const cur = monthly[monthly.length - 1].expense;
    const prev = monthly[monthly.length - 2].expense;
    if (prev > 0) {
      const diff = ((cur - prev) / prev) * 100;
      if (diff > 10) insights.push({ type: 'warning', title: 'Gastos aumentaram', message: `Você gastou ${diff.toFixed(0)}% a mais este mês.` });
      else if (diff < -10) insights.push({ type: 'success', title: 'Ótimo controle', message: `Você economizou ${Math.abs(diff).toFixed(0)}% em relação ao mês passado.` });
    }
  }
  if (categories.length > 0) {
    const top = categories[0];
    if (expense > 0 && top.amount / expense > 0.4) insights.push({ type: 'info', title: 'Categoria dominante', message: `${top.category} representa ${(top.amount / expense * 100).toFixed(0)}% dos seus gastos.` });
  }
  if (balance < 0) insights.push({ type: 'warning', title: 'Atenção ao saldo', message: 'Suas despesas superam as receitas.' });
  else if (income > 0 && balance / income > 0.3) insights.push({ type: 'success', title: 'Você está no caminho certo', message: `Economizou ${(balance / income * 100).toFixed(0)}% da sua renda.` });

  const recent = transactions.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  res.json({ balance, income, expense, saved, monthly, categories, recent, insights });
});

// Admin routes
app.get('/api/users', authenticate, requireAdmin, async (req, res) => {
  const { search } = req.query;
  const where: any = {};
  if (search) where.OR = [{ name: { contains: search as string, mode: 'insensitive' } }, { email: { contains: search as string, mode: 'insensitive' } }];
  const users = await prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, blocked: u.blocked, createdAt: u.createdAt })));
});

app.get('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
  const userId = String(req.params.id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const transactions = await prisma.transaction.findMany({ where: { userId } });
  const goals = await prisma.goal.findMany({ where: { userId } });
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, blocked: user.blocked, createdAt: user.createdAt }, transactions, goals });
});

app.put('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
  const data = userUpdateSchema.parse(req.body);
  const userId = String(req.params.id);
  const updated = await prisma.user.update({ where: { id: userId }, data });
  res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role, blocked: updated.blocked, createdAt: updated.createdAt });
});

app.delete('/api/users/:id', authenticate, requireAdmin, async (req, res) => {
  const admin = (req as any).user;
  if (req.params.id === admin.id) return res.status(400).json({ error: 'Não é possível deletar a si mesmo' });
  const userId = String(req.params.id);
  await prisma.user.delete({ where: { id: userId } });
  res.json({ ok: true });
});

app.get('/api/admin/stats', authenticate, requireAdmin, async (req, res) => {
  const totalUsers = await prisma.user.count();
  const totalAdmins = await prisma.user.count({ where: { role: 'ADMIN' } });
  const totalBlocked = await prisma.user.count({ where: { blocked: true } });
  const totalTx = await prisma.transaction.count();
  const totalGoals = await prisma.goal.count();
  const agg = await prisma.transaction.groupBy({
    by: ['type'],
    _sum: { amount: true },
  });
  const income = agg.find(a => a.type === 'INCOME')?._sum.amount || 0;
  const expense = agg.find(a => a.type === 'EXPENSE')?._sum.amount || 0;
  res.json({ totalUsers, totalAdmins, blockedUsers: totalBlocked, totalTransactions: totalTx, totalGoals, globalIncome: income, globalExpense: expense });
});

// AI Insights (with Claude)
app.post('/api/insights/ai', authenticate, async (req, res) => {
  const user = (req as any).user;
  const transactions = await prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' } });
  const goals = await prisma.goal.findMany({ where: { userId: user.id } });

  if (transactions.length === 0) {
    return res.json({ insights: [{ type: 'info', title: 'Sem dados suficientes', message: 'Adicione algumas transações para receber análises personalizadas.' }] });
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Fallback to simple insights if no API key
      const income = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
      const balance = income - expense;

      const insights = [
        { type: 'success', title: 'Análise do seu gastos', message: `Renda total: R$ ${income.toFixed(2)} | Despesas: R$ ${expense.toFixed(2)} | Saldo: R$ ${balance.toFixed(2)}` },
      ];
      return res.json({ insights });
    }

    // Build prompt for Claude
    const summary = transactions.slice(0, 10).map(t => `${t.title}: R$ ${t.amount} (${t.type})`).join(', ');
    const income = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    const totalGoals = goals.length;

    const prompt = `Analise as finanças dessa pessoa e forneça 3 insights úteis em JSON:
Renda total: R$ ${income}
Despesas totais: R$ ${expense}
Metas: ${totalGoals}
Últimas transações: ${summary}

Responda com um JSON: { "insights": [{ "type": "success|warning|info", "title": "...", "message": "..." }] }
Seja conciso e prático.`;

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json() as any;
    let insights = [{ type: 'success', title: 'Análise de IA', message: 'Análise concluída com sucesso' }];

    if (data.content && data.content[0]) {
      try {
        const text = data.content[0].text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          insights = parsed.insights || insights;
        }
      } catch (e) {
        // Fallback on parse error
      }
    }

    res.json({ insights });
  } catch (err) {
    console.error('AI Error:', err);
    res.json({ insights: [{ type: 'info', title: 'Análise indisponível', message: 'Não foi possível gerar análise de IA no momento.' }] });
  }
});

// Export endpoints
app.get('/api/export/pdf', authenticate, async (req, res) => {
  const user = (req as any).user;
  const transactions = await prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' } });

  try {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfData = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="finix-relatorio.pdf"');
      res.send(pdfData);
    });

    doc.fontSize(22).fillColor('#1f2937').text('Relatório Finix - Transações', { align: 'left' });
    doc.moveDown();
    doc.fontSize(10).fillColor('#4b5563').text(`Usuário: ${user.name} (${user.email})`);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
    doc.moveDown();

    const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);

    doc.fontSize(12).fillColor('#111827').text('Resumo', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Total de transações: ${transactions.length}`);
    doc.text(`Receitas: R$ ${totalIncome.toFixed(2)}`);
    doc.text(`Despesas: R$ ${totalExpense.toFixed(2)}`);
    doc.moveDown();

    doc.fontSize(12).text('Transações', { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const itemSpacing = 20;
    doc.fontSize(10).fillColor('#111827');
    doc.text('Data', 40, tableTop, { width: 80, continued: true });
    doc.text('Título', 130, tableTop, { width: 150, continued: true });
    doc.text('Tipo', 290, tableTop, { width: 80, continued: true });
    doc.text('Categoria', 370, tableTop, { width: 120, continued: true });
    doc.text('Valor', 490, tableTop, { width: 90, align: 'right' });
    doc.moveDown(0.5);

    transactions.forEach((t) => {
      const y = doc.y;
      doc.text(new Date(t.date).toLocaleDateString('pt-BR'), 40, y, { width: 80, continued: true });
      doc.text(t.title, 130, y, { width: 150, continued: true });
      doc.text(t.type, 290, y, { width: 80, continued: true });
      doc.text(t.category, 370, y, { width: 120, continued: true });
      doc.text(`R$ ${t.amount.toFixed(2)}`, 490, y, { width: 90, align: 'right' });
      doc.moveDown(0.5);
      if (doc.y > 720) {
        doc.addPage();
      }
    });

    doc.end();
  } catch (err) {
    console.error('Export PDF error:', err);
    res.status(500).json({ error: 'Erro ao gerar PDF' });
  }
});

app.get('/api/export/excel', authenticate, async (req, res) => {
  const user = (req as any).user;
  const transactions = await prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { date: 'desc' } });

  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Transações');

    sheet.columns = [
      { header: 'Data', key: 'date', width: 15 },
      { header: 'Título', key: 'title', width: 35 },
      { header: 'Tipo', key: 'type', width: 12 },
      { header: 'Categoria', key: 'category', width: 18 },
      { header: 'Valor', key: 'amount', width: 14 },
    ];

    sheet.addRows(transactions.map((t) => ({
      date: new Date(t.date).toLocaleDateString('pt-BR'),
      title: t.title,
      type: t.type,
      category: t.category,
      amount: t.amount,
    })));

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="finix-transacoes.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Export Excel error:', err);
    res.status(500).json({ error: 'Erro ao gerar Excel' });
  }
});


app.get('/', (req, res) => {
  res.json({ app: 'Finix TS', status: 'ok' });
});

// Seed data
const seedData = async () => {
  const adminEmail = process.env.ADMIN_EMAIL!;
  const adminPassword = process.env.ADMIN_PASSWORD!;
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Administrador Finix',
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: 'ADMIN',
      },
    });
  }
};

const PORT = Number(process.env.PORT) || 8000;

const startServer = (port: number) => {
  const server = app.listen(port, async () => {
    console.log(`Finix TS backend running on port ${port}`);
    await seedData();
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} já está em uso.`);
      console.error('Use outra porta ou pare o processo que está usando essa porta.');
      console.error(`No Windows: set PORT=${port + 1} && npm run dev`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });
};

startServer(PORT);