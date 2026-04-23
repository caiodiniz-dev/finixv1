from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import jwt
import bcrypt
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Literal
from io import BytesIO

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field, field_validator
from motor.motor_asyncio import AsyncIOMotorClient

# ---------------- Setup ----------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s - %(message)s")
logger = logging.getLogger("finix")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_TOKEN_MIN = 60 * 24 * 7  # 7 days

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Finix API", version="1.0.0")

cors_origins_env = os.environ.get("CORS_ORIGINS", "*")
origins = [o.strip() for o in cors_origins_env.split(",")] if cors_origins_env != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")

# ---------------- Security helpers ----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Não autenticado")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    if user.get("blocked"):
        raise HTTPException(status_code=403, detail="Usuário bloqueado")
    return user

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Acesso negado (admin)")
    return user

# ---------------- Models ----------------
class RegisterIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Literal["USER", "ADMIN"]
    blocked: bool = False
    createdAt: datetime

class AuthOut(BaseModel):
    user: UserOut
    token: str

class TransactionIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    amount: float = Field(..., gt=0)
    type: Literal["INCOME", "EXPENSE"]
    category: str
    description: Optional[str] = ""
    date: datetime
    recurring: bool = False
    recurringFrequency: Optional[Literal["monthly", "weekly", "yearly"]] = None

class TransactionOut(TransactionIn):
    id: str
    userId: str
    createdAt: datetime

class GoalIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    targetAmount: float = Field(..., gt=0)
    currentAmount: float = Field(0, ge=0)
    deadline: datetime

class GoalOut(GoalIn):
    id: str
    userId: str
    createdAt: datetime

class BudgetIn(BaseModel):
    category: str
    limit: float = Field(..., gt=0)

class BudgetOut(BudgetIn):
    id: str
    userId: str
    createdAt: datetime

class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=80)
    currentPassword: Optional[str] = None
    newPassword: Optional[str] = Field(None, min_length=6, max_length=128)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[Literal["USER", "ADMIN"]] = None
    blocked: Optional[bool] = None

# ---------------- Serializers ----------------
def user_public(u: dict) -> dict:
    return {
        "id": u["id"],
        "name": u["name"],
        "email": u["email"],
        "role": u.get("role", "USER"),
        "blocked": u.get("blocked", False),
        "createdAt": u["createdAt"],
    }

def tx_public(t: dict) -> dict:
    return {
        "id": t["id"], "userId": t["userId"], "title": t["title"],
        "amount": t["amount"], "type": t["type"], "category": t["category"],
        "description": t.get("description", ""), "date": t["date"],
        "recurring": t.get("recurring", False),
        "recurringFrequency": t.get("recurringFrequency"),
        "createdAt": t["createdAt"],
    }

def budget_public(b: dict) -> dict:
    return {"id": b["id"], "userId": b["userId"], "category": b["category"],
            "limit": b["limit"], "createdAt": b["createdAt"]}

def goal_public(g: dict) -> dict:
    return {
        "id": g["id"], "userId": g["userId"], "title": g["title"],
        "targetAmount": g["targetAmount"], "currentAmount": g["currentAmount"],
        "deadline": g["deadline"], "createdAt": g["createdAt"],
    }

# ---------------- Auth Routes ----------------
@api.post("/auth/register", response_model=AuthOut)
async def register(payload: RegisterIn):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    user = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "USER",
        "blocked": False,
        "createdAt": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["email"], user["role"])
    return {"user": user_public(user), "token": token}

@api.post("/auth/login", response_model=AuthOut)
async def login(payload: LoginIn):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if user.get("blocked"):
        raise HTTPException(status_code=403, detail="Usuário bloqueado")
    token = create_access_token(user["id"], user["email"], user.get("role", "USER"))
    return {"user": user_public(user), "token": token}

@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return user_public(user)

# ---------------- Transactions ----------------
@api.get("/transactions")
async def list_transactions(
    user: dict = Depends(get_current_user),
    type: Optional[Literal["INCOME", "EXPENSE"]] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    startDate: Optional[datetime] = None,
    endDate: Optional[datetime] = None,
):
    q: dict = {"userId": user["id"]}
    if type: q["type"] = type
    if category: q["category"] = category
    if search: q["title"] = {"$regex": search, "$options": "i"}
    if startDate or endDate:
        q["date"] = {}
        if startDate: q["date"]["$gte"] = startDate
        if endDate: q["date"]["$lte"] = endDate
    items = await db.transactions.find(q, {"_id": 0}).sort("date", -1).to_list(2000)
    return [tx_public(i) for i in items]

@api.post("/transactions")
async def create_transaction(payload: TransactionIn, user: dict = Depends(get_current_user)):
    tx = {**payload.model_dump(), "id": str(uuid.uuid4()),
          "userId": user["id"], "createdAt": datetime.now(timezone.utc)}
    await db.transactions.insert_one(tx)
    tx.pop("_id", None)
    return tx_public(tx)

@api.put("/transactions/{tx_id}")
async def update_transaction(tx_id: str, payload: TransactionIn, user: dict = Depends(get_current_user)):
    res = await db.transactions.update_one(
        {"id": tx_id, "userId": user["id"]},
        {"$set": payload.model_dump()},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    tx = await db.transactions.find_one({"id": tx_id}, {"_id": 0})
    return tx_public(tx)

@api.delete("/transactions/{tx_id}")
async def delete_transaction(tx_id: str, user: dict = Depends(get_current_user)):
    res = await db.transactions.delete_one({"id": tx_id, "userId": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return {"ok": True}

# ---------------- Goals ----------------
@api.get("/goals")
async def list_goals(user: dict = Depends(get_current_user)):
    items = await db.goals.find({"userId": user["id"]}, {"_id": 0}).sort("deadline", 1).to_list(500)
    return [goal_public(i) for i in items]

@api.post("/goals")
async def create_goal(payload: GoalIn, user: dict = Depends(get_current_user)):
    g = {**payload.model_dump(), "id": str(uuid.uuid4()),
         "userId": user["id"], "createdAt": datetime.now(timezone.utc)}
    await db.goals.insert_one(g)
    g.pop("_id", None)
    return goal_public(g)

@api.put("/goals/{goal_id}")
async def update_goal(goal_id: str, payload: GoalIn, user: dict = Depends(get_current_user)):
    res = await db.goals.update_one({"id": goal_id, "userId": user["id"]},
                                    {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    g = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    return goal_public(g)

@api.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, user: dict = Depends(get_current_user)):
    res = await db.goals.delete_one({"id": goal_id, "userId": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    return {"ok": True}

# ---------------- Dashboard & Insights ----------------
@api.get("/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    txs = await db.transactions.find({"userId": user["id"]}, {"_id": 0}).to_list(5000)
    goals = await db.goals.find({"userId": user["id"]}, {"_id": 0}).to_list(500)

    income = sum(t["amount"] for t in txs if t["type"] == "INCOME")
    expense = sum(t["amount"] for t in txs if t["type"] == "EXPENSE")
    balance = income - expense
    saved = sum(g["currentAmount"] for g in goals)

    # monthly aggregation (last 6 months)
    now = datetime.now(timezone.utc)
    months = []
    for i in range(5, -1, -1):
        y = now.year
        m = now.month - i
        while m <= 0:
            m += 12
            y -= 1
        months.append((y, m))
    monthly = []
    for y, m in months:
        start = datetime(y, m, 1, tzinfo=timezone.utc)
        nm_y = y + (1 if m == 12 else 0)
        nm_m = 1 if m == 12 else m + 1
        end = datetime(nm_y, nm_m, 1, tzinfo=timezone.utc)
        inc = sum(t["amount"] for t in txs if t["type"] == "INCOME" and start <= _as_dt(t["date"]) < end)
        exp = sum(t["amount"] for t in txs if t["type"] == "EXPENSE" and start <= _as_dt(t["date"]) < end)
        monthly.append({"month": f"{start.strftime('%b')}/{str(y)[-2:]}", "income": inc, "expense": exp})

    # by category (expenses)
    by_cat: dict = {}
    for t in txs:
        if t["type"] == "EXPENSE":
            by_cat[t["category"]] = by_cat.get(t["category"], 0) + t["amount"]
    categories = [{"category": k, "amount": v} for k, v in sorted(by_cat.items(), key=lambda x: -x[1])]

    # insights (rule-based)
    insights = []
    if len(monthly) >= 2:
        cur = monthly[-1]["expense"]
        prev = monthly[-2]["expense"]
        if prev > 0:
            diff = ((cur - prev) / prev) * 100
            if diff > 10:
                insights.append({"type": "warning", "title": "Gastos aumentaram", "message": f"Você gastou {diff:.0f}% a mais este mês em relação ao anterior."})
            elif diff < -10:
                insights.append({"type": "success", "title": "Ótimo controle", "message": f"Você economizou {abs(diff):.0f}% em relação ao mês passado. Continue assim!"})
    if categories:
        top = categories[0]
        if expense > 0 and top["amount"] / expense > 0.4:
            insights.append({"type": "info", "title": "Categoria dominante", "message": f"{top['category']} representa {top['amount']/expense*100:.0f}% dos seus gastos."})
    if balance < 0:
        insights.append({"type": "warning", "title": "Atenção ao saldo", "message": "Suas despesas superam as receitas. Revise seus gastos."})
    elif income > 0 and balance / income > 0.3:
        insights.append({"type": "success", "title": "Você está no caminho certo", "message": f"Economizou {balance/income*100:.0f}% da sua renda. Excelente!"})

    recent = sorted([tx_public(t) for t in txs], key=lambda x: x["date"], reverse=True)[:5]

    return {
        "balance": balance, "income": income, "expense": expense, "saved": saved,
        "monthly": monthly, "categories": categories, "recent": recent,
        "insights": insights,
    }

def _as_dt(v) -> datetime:
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(str(v).replace("Z", "+00:00"))

# ---------------- Export ----------------
@api.get("/export/excel")
async def export_excel(user: dict = Depends(get_current_user)):
    from openpyxl import Workbook
    txs = await db.transactions.find({"userId": user["id"]}, {"_id": 0}).sort("date", -1).to_list(5000)
    wb = Workbook()
    ws = wb.active
    ws.title = "Transações"
    ws.append(["Data", "Título", "Tipo", "Categoria", "Valor", "Descrição"])
    for t in txs:
        ws.append([_as_dt(t["date"]).strftime("%d/%m/%Y"), t["title"], t["type"],
                   t["category"], t["amount"], t.get("description", "")])
    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                             headers={"Content-Disposition": "attachment; filename=finix-transacoes.xlsx"})

@api.get("/export/pdf")
async def export_pdf(user: dict = Depends(get_current_user)):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import cm
    txs = await db.transactions.find({"userId": user["id"]}, {"_id": 0}).sort("date", -1).to_list(5000)
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    c.setFillColorRGB(0.145, 0.388, 0.921)
    c.rect(0, h - 2.5 * cm, w, 2.5 * cm, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 20)
    c.drawString(2 * cm, h - 1.6 * cm, "Finix — Relatório Financeiro")
    c.setFont("Helvetica", 10)
    c.drawString(2 * cm, h - 2.2 * cm, f"Usuário: {user['name']}  ·  {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    y = h - 3.5 * cm
    c.setFillColorRGB(0, 0, 0)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2 * cm, y, "Data")
    c.drawString(4.5 * cm, y, "Título")
    c.drawString(10 * cm, y, "Categoria")
    c.drawString(14 * cm, y, "Tipo")
    c.drawRightString(w - 2 * cm, y, "Valor")
    y -= 0.5 * cm
    c.setFont("Helvetica", 9)
    for t in txs:
        if y < 2 * cm:
            c.showPage(); y = h - 2 * cm
        c.drawString(2 * cm, y, _as_dt(t["date"]).strftime("%d/%m/%Y"))
        c.drawString(4.5 * cm, y, (t["title"][:30]))
        c.drawString(10 * cm, y, t["category"][:20])
        c.drawString(14 * cm, y, t["type"])
        sign = "+" if t["type"] == "INCOME" else "-"
        c.drawRightString(w - 2 * cm, y, f"{sign}R$ {t['amount']:.2f}")
        y -= 0.45 * cm
    c.save()
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": "attachment; filename=finix-relatorio.pdf"})

# ---------------- Admin ----------------
@api.get("/users")
async def list_users(user: dict = Depends(require_admin), search: Optional[str] = None):
    q: dict = {}
    if search:
        q = {"$or": [{"name": {"$regex": search, "$options": "i"}},
                     {"email": {"$regex": search, "$options": "i"}}]}
    users = await db.users.find(q, {"_id": 0, "password_hash": 0}).sort("createdAt", -1).to_list(500)
    return [user_public(u) for u in users]

@api.get("/users/{user_id}")
async def get_user(user_id: str, _: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    txs = await db.transactions.find({"userId": user_id}, {"_id": 0}).to_list(1000)
    goals = await db.goals.find({"userId": user_id}, {"_id": 0}).to_list(200)
    return {"user": user_public(u),
            "transactions": [tx_public(t) for t in txs],
            "goals": [goal_public(g) for g in goals]}

@api.put("/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdate, _: dict = Depends(require_admin)):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="Sem dados para atualizar")
    res = await db.users.update_one({"id": user_id}, {"$set": data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return user_public(u)

@api.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Não é possível deletar a si mesmo")
    res = await db.users.delete_one({"id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    await db.transactions.delete_many({"userId": user_id})
    await db.goals.delete_many({"userId": user_id})
    return {"ok": True}

@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_admins = await db.users.count_documents({"role": "ADMIN"})
    total_blocked = await db.users.count_documents({"blocked": True})
    total_tx = await db.transactions.count_documents({})
    total_goals = await db.goals.count_documents({})
    agg = await db.transactions.aggregate([
        {"$group": {"_id": "$type", "total": {"$sum": "$amount"}}}
    ]).to_list(10)
    income = next((x["total"] for x in agg if x["_id"] == "INCOME"), 0)
    expense = next((x["total"] for x in agg if x["_id"] == "EXPENSE"), 0)
    return {
        "totalUsers": total_users, "totalAdmins": total_admins, "blockedUsers": total_blocked,
        "totalTransactions": total_tx, "totalGoals": total_goals,
        "globalIncome": income, "globalExpense": expense,
    }

# ---------------- Profile ----------------
@api.put("/profile")
async def update_profile(payload: ProfileUpdate, user: dict = Depends(get_current_user)):
    updates: dict = {}
    if payload.name:
        updates["name"] = payload.name.strip()
    if payload.newPassword:
        if not payload.currentPassword:
            raise HTTPException(status_code=400, detail="Informe a senha atual")
        db_user = await db.users.find_one({"id": user["id"]})
        if not verify_password(payload.currentPassword, db_user["password_hash"]):
            raise HTTPException(status_code=400, detail="Senha atual incorreta")
        updates["password_hash"] = hash_password(payload.newPassword)
    if not updates:
        raise HTTPException(status_code=400, detail="Nada para atualizar")
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return user_public(u)

# ---------------- Budgets ----------------
@api.get("/budgets")
async def list_budgets(user: dict = Depends(get_current_user)):
    items = await db.budgets.find({"userId": user["id"]}, {"_id": 0}).to_list(200)
    # compute spent this month per category
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    txs = await db.transactions.find({
        "userId": user["id"], "type": "EXPENSE",
        "date": {"$gte": month_start}
    }, {"_id": 0}).to_list(5000)
    spent_by_cat: dict = {}
    for t in txs:
        spent_by_cat[t["category"]] = spent_by_cat.get(t["category"], 0) + t["amount"]
    result = []
    for b in items:
        spent = spent_by_cat.get(b["category"], 0)
        result.append({**budget_public(b), "spent": spent,
                       "percentage": (spent / b["limit"] * 100) if b["limit"] > 0 else 0})
    return result

@api.post("/budgets")
async def create_budget(payload: BudgetIn, user: dict = Depends(get_current_user)):
    existing = await db.budgets.find_one({"userId": user["id"], "category": payload.category})
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um orçamento para esta categoria")
    b = {**payload.model_dump(), "id": str(uuid.uuid4()),
         "userId": user["id"], "createdAt": datetime.now(timezone.utc)}
    await db.budgets.insert_one(b)
    b.pop("_id", None)
    return budget_public(b)

@api.put("/budgets/{budget_id}")
async def update_budget(budget_id: str, payload: BudgetIn, user: dict = Depends(get_current_user)):
    res = await db.budgets.update_one({"id": budget_id, "userId": user["id"]},
                                      {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    b = await db.budgets.find_one({"id": budget_id}, {"_id": 0})
    return budget_public(b)

@api.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, user: dict = Depends(get_current_user)):
    res = await db.budgets.delete_one({"id": budget_id, "userId": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    return {"ok": True}

# ---------------- AI Insights ----------------
@api.post("/insights/ai")
async def ai_insights(user: dict = Depends(get_current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        raise HTTPException(status_code=500, detail="emergentintegrations não instalado")

    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY não configurado")

    txs = await db.transactions.find({"userId": user["id"]}, {"_id": 0}).to_list(2000)
    goals = await db.goals.find({"userId": user["id"]}, {"_id": 0}).to_list(200)

    if not txs:
        return {"insights": [{"type": "info", "title": "Sem dados suficientes",
                              "message": "Adicione algumas transações para receber análises personalizadas."}]}

    income = sum(t["amount"] for t in txs if t["type"] == "INCOME")
    expense = sum(t["amount"] for t in txs if t["type"] == "EXPENSE")
    by_cat: dict = {}
    for t in txs:
        if t["type"] == "EXPENSE":
            by_cat[t["category"]] = by_cat.get(t["category"], 0) + t["amount"]
    top_cats = sorted(by_cat.items(), key=lambda x: -x[1])[:5]

    # Monthly trend
    now = datetime.now(timezone.utc)
    this_month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    prev_month_end = this_month_start
    py, pm = (now.year, now.month - 1) if now.month > 1 else (now.year - 1, 12)
    prev_month_start = datetime(py, pm, 1, tzinfo=timezone.utc)
    this_exp = sum(t["amount"] for t in txs if t["type"] == "EXPENSE" and _as_dt(t["date"]) >= this_month_start)
    prev_exp = sum(t["amount"] for t in txs if t["type"] == "EXPENSE"
                   and prev_month_start <= _as_dt(t["date"]) < prev_month_end)

    summary = (
        f"Nome: {user['name']}\n"
        f"Receitas totais: R$ {income:.2f}\n"
        f"Despesas totais: R$ {expense:.2f}\n"
        f"Saldo: R$ {income - expense:.2f}\n"
        f"Gastos este mês: R$ {this_exp:.2f} (mês anterior: R$ {prev_exp:.2f})\n"
        f"Top 5 categorias de gasto: " + ", ".join([f"{k} R${v:.0f}" for k, v in top_cats]) + "\n"
        f"Metas ativas: {len(goals)} — progresso: " +
        ", ".join([f"{g['title']} {g['currentAmount']/max(g['targetAmount'],1)*100:.0f}%" for g in goals[:3]])
    )

    system = (
        "Você é o consultor financeiro pessoal do Finix. Sua missão é analisar os dados "
        "financeiros do usuário e devolver EXCLUSIVAMENTE um JSON array válido com "
        "exatamente 4 a 6 insights. Cada insight tem os campos: "
        '"type" (um de: "success", "warning", "info"), '
        '"title" (curto, no máximo 40 caracteres), e '
        '"message" (recomendação prática e específica em português BR, no máximo 180 caracteres). '
        "Use tom amigável, direto e motivador. Cite números reais. "
        "Responda APENAS com o JSON array, sem markdown, sem texto antes ou depois."
    )
    try:
        chat = LlmChat(
            api_key=key,
            session_id=f"finix-insights-{user['id']}",
            system_message=system,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        resp = await chat.send_message(UserMessage(text=f"Dados do usuário:\n{summary}\n\nGere os 4-6 insights agora."))
    except Exception as e:
        logger.error(f"AI insights error: {e}")
        raise HTTPException(status_code=503, detail="Serviço de IA indisponível no momento")

    import json, re
    raw = resp.strip()
    # strip markdown fences if any
    m = re.search(r"\[.*\]", raw, re.DOTALL)
    if m:
        raw = m.group(0)
    try:
        parsed = json.loads(raw)
        insights = [i for i in parsed if isinstance(i, dict) and {"type", "title", "message"} <= set(i)]
        return {"insights": insights[:6], "generated_at": datetime.now(timezone.utc).isoformat()}
    except Exception:
        return {"insights": [{"type": "info", "title": "Análise gerada",
                              "message": resp[:500]}],
                "generated_at": datetime.now(timezone.utc).isoformat()}

# ---------------- Health ----------------
@api.get("/")
async def root():
    return {"app": "Finix", "status": "ok"}

app.include_router(api)

# ---------------- Startup ----------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.transactions.create_index([("userId", 1), ("date", -1)])
    await db.goals.create_index("userId")
    await db.budgets.create_index([("userId", 1), ("category", 1)], unique=True)
    await seed_admin()
    await seed_demo()
    logger.info("Finix backend started")

async def seed_admin():
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "name": "Administrador Finix",
            "email": email, "password_hash": hash_password(password),
            "role": "ADMIN", "blocked": False,
            "createdAt": datetime.now(timezone.utc),
        })
        logger.info(f"Seeded admin: {email}")
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email},
                                  {"$set": {"password_hash": hash_password(password), "role": "ADMIN"}})
        logger.info("Updated admin password from .env")

async def seed_demo():
    email = "demo@finix.com"
    existing = await db.users.find_one({"email": email})
    if existing:
        return
    uid = str(uuid.uuid4())
    await db.users.insert_one({
        "id": uid, "name": "Usuário Demo", "email": email,
        "password_hash": hash_password("Demo@123"),
        "role": "USER", "blocked": False,
        "createdAt": datetime.now(timezone.utc),
    })
    now = datetime.now(timezone.utc)
    sample_tx = [
        ("Salário", 8500, "INCOME", "Salário", 2),
        ("Freelance Design", 1800, "INCOME", "Freelance", 18),
        ("Aluguel", 2200, "EXPENSE", "Moradia", 5),
        ("Mercado", 680, "EXPENSE", "Alimentação", 7),
        ("Netflix", 55, "EXPENSE", "Lazer", 10),
        ("Uber", 180, "EXPENSE", "Transporte", 12),
        ("Academia", 120, "EXPENSE", "Saúde", 15),
        ("Restaurante", 240, "EXPENSE", "Alimentação", 20),
        ("Conta de luz", 210, "EXPENSE", "Moradia", 22),
        ("Spotify", 21, "EXPENSE", "Lazer", 25),
    ]
    # spread across last 3 months
    docs = []
    for i, (title, amount, ttype, cat, day_back) in enumerate(sample_tx):
        for m in range(3):
            d = now - timedelta(days=day_back + m * 30)
            docs.append({
                "id": str(uuid.uuid4()), "userId": uid, "title": title,
                "amount": amount * (1 + (i % 3) * 0.05), "type": ttype,
                "category": cat, "description": "",
                "date": d, "createdAt": now,
            })
    await db.transactions.insert_many(docs)
    await db.budgets.insert_many([
        {"id": str(uuid.uuid4()), "userId": uid, "category": "Alimentação", "limit": 1000, "createdAt": now},
        {"id": str(uuid.uuid4()), "userId": uid, "category": "Lazer", "limit": 300, "createdAt": now},
        {"id": str(uuid.uuid4()), "userId": uid, "category": "Transporte", "limit": 400, "createdAt": now},
    ])
    await db.goals.insert_many([
        {"id": str(uuid.uuid4()), "userId": uid, "title": "Reserva de emergência",
         "targetAmount": 15000, "currentAmount": 6200,
         "deadline": now + timedelta(days=180), "createdAt": now},
        {"id": str(uuid.uuid4()), "userId": uid, "title": "Viagem Europa",
         "targetAmount": 25000, "currentAmount": 4300,
         "deadline": now + timedelta(days=365), "createdAt": now},
        {"id": str(uuid.uuid4()), "userId": uid, "title": "Notebook novo",
         "targetAmount": 8000, "currentAmount": 5500,
         "deadline": now + timedelta(days=90), "createdAt": now},
    ])
    logger.info(f"Seeded demo user {email} with sample data")
