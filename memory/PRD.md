# Finix — Product Requirements Document (PRD)

**Nome:** Finix — Suas finanças, seu futuro.
**Tipo:** SaaS premium de gestão financeira pessoal
**Idioma:** Português (BR)
**Paleta:** #2563EB (azul), #7C3AED (roxo), #22C55E (verde), #0F172A (dark), #F1F5F9 (light)
**Tipografia:** Inter + Poppins (display)

## Stack adotado
- **Frontend:** React 18 + TypeScript + CRA + Tailwind CSS + React Router v6 + Axios + React Hook Form + Yup + Framer Motion + Recharts + Lucide React + React Hot Toast
- **Backend:** FastAPI + Motor (async MongoDB) + PyJWT + bcrypt + Pydantic v2 + openpyxl + reportlab + emergentintegrations (Claude Sonnet 4.5)
- **DB:** MongoDB (coleções: users, transactions, goals, budgets)

> **Nota:** o problema original pedia Node+Express+Prisma+PostgreSQL, mas o usuário optou por manter os defaults do ambiente (FastAPI+MongoDB) — todas as funcionalidades solicitadas foram preservadas.

## User personas
- **Usuário comum (USER):** quer controlar gastos, criar metas, ver insights inteligentes, receber alertas de orçamento, exportar relatórios.
- **Administrador (ADMIN):** gerencia usuários, visualiza estatísticas globais, bloqueia/deleta contas, promove papéis.

## Arquitetura
```
/app
├── backend/        server.py (monolito didático) + .env + requirements.txt
└── frontend/
    ├── src/
    │   ├── components/    Logo
    │   ├── contexts/      AuthContext (localStorage finix_token)
    │   ├── layouts/       AppLayout (sidebar + topbar)
    │   ├── pages/         Landing, Login, Register, Dashboard, Transactions, Goals, Budgets, Profile, Admin
    │   ├── services/      api.ts (axios + Bearer interceptor)
    │   ├── utils/         format.ts (currency, dateBR, CATEGORIES)
    │   └── types.ts       DTOs compartilhados
```

## Funcionalidades implementadas
### v1.0 — Núcleo (iteração 1 — ✅ 100% testes passando)
- Autenticação JWT (register/login/me) com bcrypt
- Role-based (USER/ADMIN), admin seeding idempotente, persistência em localStorage
- Dashboard: saldo / receitas / despesas / economizado + 6 meses (Area) + pizza (categorias) + barras (comparativo) + últimas transações + insights rule-based
- Transações CRUD com filtros (tipo, categoria, pesquisa de título, datas)
- Metas CRUD com barras de progresso animadas e previsão de conclusão
- Admin panel: listar/buscar usuários, ver detalhes com nested tx/metas, editar role, bloquear, deletar (cascata), stats globais
- Exportação PDF (header colorido + tabela) e Excel (openpyxl)
- Landing responsiva com logo Finix, hero, features, CTA
- Dark mode toggle persistido em localStorage
- Design responsivo total, skeletons, toasts, empty states

### v1.1 — Expansão (iteração 2 — ✅ 17/17 novos testes)
- **IA real**: `POST /api/insights/ai` via Claude Sonnet 4.5 (emergentintegrations + EMERGENT_LLM_KEY) — gera 4-6 insights personalizados em PT-BR
- **Profile**: `PUT /api/profile` — editar nome + trocar senha (verifica currentPassword)
- **Budgets**: CRUD `/api/budgets` — limites mensais por categoria, calcula % gasto no mês, alertas verde/âmbar/vermelho (80%/100%)
- **Transações recorrentes**: campo `recurring` + `recurringFrequency` (monthly/weekly/yearly) com chip visual na lista
- **Landing v2**: hero com orbs animados, scroll progress bar, floating AI cards, counters animados (4.230/128.000+/98%/25+), 9 feature cards com gradientes, 3 showcases com mockups SVG animados, 3 depoimentos, pricing R$0, CTA gigante com pattern

## Credenciais de teste (dev)
- Admin: `admin@finix.com` / `Admin@123`
- Demo: `demo@finix.com` / `Demo@123` (dados: 30 tx em 3 meses, 3 metas, 3 orçamentos)

## Roadmap (backlog)
### P1
- Migrar `@app.on_event` → lifespan (FastAPI ≥0.109)
- Refresh token (access 15min + refresh 7d em httpOnly cookie)
- Custom categories por usuário (combobox em vez de select fixo)
- Forgot password (link de reset com token TTL)

### P2
- Importação CSV/OFX
- Dashboard admin com gráfico de crescimento de usuários
- Notificações por e-mail quando orçamento ultrapassar 100%
- Multi-moeda (USD/EUR além de BRL)
- Orçamento anual (não só mensal)
- Compartilhar metas com parceiro/família

### P3
- Mobile app (React Native / Expo)
- Integração bancária via Open Finance Brasil
- Chat financeiro com histórico (usar LlmChat com session persistente)
- Tags/labels por transação
- Achievement system (gamification)

## Observações técnicas
- Todos endpoints têm prefixo `/api`
- Token JWT (HS256, 7 dias) em `Authorization: Bearer`
- Emails normalizados para lowercase no register/login
- MongoDB índices únicos: users.email, budgets(userId+category)
- TTL aware datetime: `datetime.now(timezone.utc)`
