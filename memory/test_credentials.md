# Finix - Test Credentials

## Admin
- Email: `admin@finix.com`
- Senha: `Admin@123`
- Role: `ADMIN`

## Usuário Demo
- Email: `demo@finix.com`
- Senha: `Demo@123`
- Role: `USER`
- Possui dados de exemplo pré-carregados (transações e metas nos últimos 3 meses)

## Endpoints principais
- `POST /api/auth/register`  — Cadastro de novo usuário
- `POST /api/auth/login`     — Login (retorna `{user, token}`)
- `GET  /api/auth/me`        — Usuário autenticado
- `GET  /api/dashboard`      — Estatísticas, insights, últimas transações
- `GET  /api/transactions`   — Lista de transações (filtros: type, category, search, startDate, endDate)
- `POST /api/transactions`
- `PUT  /api/transactions/{id}`
- `DELETE /api/transactions/{id}`
- `GET  /api/goals`, `POST /api/goals`, `PUT /api/goals/{id}`, `DELETE /api/goals/{id}`
- `GET  /api/users` (admin) — Lista usuários com `?search=`
- `GET  /api/users/{id}` (admin) — Detalhe + transações + metas
- `PUT  /api/users/{id}` (admin) — Atualiza name/role/blocked
- `DELETE /api/users/{id}` (admin) — Exclui usuário e cascata (tx + goals)
- `GET  /api/admin/stats` (admin) — Estatísticas globais
- `GET  /api/export/pdf`, `GET /api/export/excel` — Exportação

## Autenticação
Bearer token em `Authorization: Bearer <token>`. Token persistido em `localStorage` como `finix_token`.
