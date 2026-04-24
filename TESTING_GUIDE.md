# 🧪 Teste Rápido - Finix Melhorado

## ✅ Checklist de Features

### 1. **Foto de Perfil com Preview**
- [ ] Acesse `/app/profile`
- [ ] Seção "Foto de perfil"
- [ ] Selecione uma imagem
- [ ] Vê preview aparecer? ✨
- [ ] Clique X para remover
- [ ] Clique "Enviar foto"
- [ ] Página recarrega
- [ ] Foto aparece no card do perfil

### 2. **Foto na Sidebar**
- [ ] Após enviar foto, vá para Dashboard
- [ ] Veja a barra lateral esquerda (desktop) ou menu (mobile)
- [ ] Sua foto deve aparecer redonda no topo
- [ ] Com fallback: iniciais (A, B, etc) se sem foto

### 3. **Saudação Personalizada**
- [ ] Acesse `/app/dashboard`
- [ ] Titulo diz "Olá, [seu nome]! 👋"
- [ ] Antes dizia só "Dashboard"

### 4. **IA com Análises**
- [ ] No Dashboard → Botão "Análise com IA"
- [ ] Clique nele
- [ ] Aguarde...
- [ ] Mostra cards com insights? ✨
- [ ] Sucesso = "Análise da IA pronta!"

### 5. **Exportação**
- [ ] Dashboard → Botão "PDF"
- [ ] Arquivo baixa (finix-relatorio.html ou finix-relatorio.pdf)
- [ ] Dashboard → Botão "Excel"  
- [ ] Arquivo baixa (finix-transacoes.csv ou .xlsx)

---

## 🔍 Debug - Se Não Funcionar

### Foto não aparece?
```bash
# 1. Verifique se está em base64 no perfil
# 2. Console do navegador (F12):
localStorage.setItem('finix_token', 'seu_token_aqui')
# 3. Abra https://localhost:8000/api/auth/me
# Deve ver "photo": "data:image/..." em base64
```

### IA não funciona?
```bash
# 1. Sem ANTHROPIC_API_KEY = análise simples (OK)
# 2. Com chave = análise inteligente
# 3. Verifique no backend console:
# "AI Error: ..." = problema na requisição
```

### Exportação retorna erro?
```bash
# Versão atual retorna HTML/CSV
# Para PDF real, precisa instalar: npm install pdfkit
# Para XLSX real: npm install xlsx
```

---

## 🎨 UX Testing

### Responsividade
- [ ] Desktop (1920px): Layout completo ✓
- [ ] Tablet (768px): Menu colapse ✓
- [ ] Mobile (375px): Tudo acessível ✓

### Tema Escuro
- [ ] Clique lua 🌙 no perfil
- [ ] Dashboard fica escuro ✓
- [ ] Foto visível? ✓
- [ ] Contraste OK? ✓

### Performance
- [ ] Dashboard carrega em < 2s
- [ ] Enviar foto em < 3s
- [ ] Análise IA em < 5s

---

## 📊 Dados de Teste

### Admin
```
Email: admin@finix.com
Senha: Admin@123
Role: ADMIN
Acesso: Painel admin (/app/admin)
```

### User Demo (com dados)
```
Email: demo@finix.com
Senha: Demo@123
Role: USER
Dados: 5 transações de exemplo (últimos 30 dias)
```

### Novo Usuário
```
Nome: Seu Nome
Email: seu@email.com (novo)
Senha: MinhaS3nh@
Role: USER (automático)
Sem dados iniciais
```

---

## 🚀 Cenários de Teste

### Cenário 1: Setup Completo
1. Login com `demo@finix.com`
2. Vá para Perfil
3. Envie foto
4. Volte para Dashboard
5. Veja a foto na sidebar
6. Clique "Análise com IA"
7. Exporte em PDF/Excel

### Cenário 2: Sem IA (sem chave API)
1. Certifique que ANTHROPIC_API_KEY está vazio
2. Clique "Análise com IA"
3. Deve mostrar análise simples (não erro!)

### Cenário 3: Novo Usuário
1. Clique "Registrar"
2. Preencha dados
3. Clique "Registrar"
4. Automático redirect para Dashboard
5. Veja saudação personalizada
6. Envie foto
7. Tudo funciona? ✓

---

## 📝 Notas

- **Fotos são base64**: Armazenadas direto no banco (SQLite)
- **IA fallback**: Se Claude falhar, mostra análise simples
- **CSV instead of XLSX**: Para compatibilidade (abre em Excel normalmente)
- **HTML instead of PDF**: Pode ser convertido com `pdfkit` depois

---

**Tudo testado? Parabéns! 🎉**
