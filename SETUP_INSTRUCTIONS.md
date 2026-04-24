# 🚀 Finix - Instruções de Setup

## ✨ O que foi melhorado

✅ **Corrigido erro de porta** - Backend agora na porta 8000  
✅ **Melhorado input de foto** - Com preview em tempo real e validações  
✅ **Foto em todos os lugares** - Mostra na sidebar, perfil e dashboard  
✅ **Saudação personalizada** - Dashboard com "Olá, {nome}! 👋"  
✅ **Exportação PDF/Excel** - Endpoints prontos  
✅ **IA com Claude** - Integração básica implementada  

---

## 🔧 Como Rodar

### 1. Backend

```bash
cd backend-ts
npm install  # (se não tiver rodado antes)
npm run dev
```

Você verá: `Finix TS backend running on port 8000`

### 2. Frontend (em outro terminal)

```bash
cd frontend
npm install  # (se não tiver rodado antes)
npm run dev
```n

Acesse: **http://localhost:3000**

---

## 🤖 Para Ativar IA com Claude (Opcional)

1. **Crie uma conta em**: https://console.anthropic.com
2. **Gere uma API Key**
3. **Adicione ao `backend-ts/.env`**:
   ```
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxx
   ```
4. **Reinicie o backend**

Sem a chave, a IA usa análises simples (segue funcionando).

---

## 🧪 Teste as Novas Features

### Logar
- Email: `demo@finix.com`
- Senha: `Demo@123`

### 1. Foto de Perfil ✅
- Vá para **Perfil**
- Clique em "Selecionar foto"
- Escolha uma imagem (max 5MB)
- Veja preview em tempo real
- Clique "Enviar foto"
- ✨ Foto aparece na sidebar automaticamente!

### 2. Saudação ✅
- Vá para **Dashboard**
- Veja "Olá, {seu nome}! 👋" no topo

### 3. Foto em Toda Parte ✅
- Sidebar: Mostra sua foto redonda
- Profile: Mostra sua foto grande
- Dashboard: Seu nome com emoji

### 4. IA ✅
- No Dashboard, clique "Análise com IA"
- Se tiver `ANTHROPIC_API_KEY`: Análise inteligente
- Se não tiver: Análise básica com seus números

### 5. Exportar ✅
- Dashboard → Clique "PDF" ou "Excel"
- Baixa suas transações em HTML/CSV

---

## 📝 Arquivos Modificados

```
backend-ts/
  .env                    ← Porta 5000→8000, added ANTHROPIC_API_KEY
  src/server.ts           ← Endpoints PDF/Excel + IA com Claude

frontend/
  .env                    ← Backend URL 5000→8000
  src/pages/Dashboard.tsx ← Saudação + useAuth hook
  src/pages/Profile.tsx   ← Preview de foto
  src/layouts/AppLayout.tsx ← Foto na sidebar
```

---

## 🆘 Se der erro

1. **Porta 8000/3000 em uso?**
   ```bash
   # Mude PORT no backend-ts/.env ou
   PORT=9000 npm run dev
   ```

2. **Erro de módulos?**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Foto muito grande?**
   - Máximo: 5MB
   - Formatos: PNG, JPG, GIF, WebP

---

## 📚 Endpoints Novos

```
POST   /api/insights/ai      ← Gera análise com IA (ou simples)
GET    /api/export/pdf       ← Exporta em HTML/PDF
GET    /api/export/excel     ← Exporta em CSV/Excel
```

---

**Tudo pronto! 🎉 Aproveita as melhorias!**
