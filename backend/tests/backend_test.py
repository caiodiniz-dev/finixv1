"""Finix backend API tests - auth, transactions, goals, dashboard, admin, export."""
import os, uuid, pytest, requests
from datetime import datetime, timezone, timedelta

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://c63db10d-ed4c-46b1-ac6d-04e10bda64bc.preview.emergentagent.com"
API = f"{BASE}/api"

ADMIN = {"email": "admin@finix.com", "password": "Admin@123"}
DEMO = {"email": "demo@finix.com", "password": "Demo@123"}


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def demo_token():
    r = requests.post(f"{API}/auth/login", json=DEMO, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def h(token): return {"Authorization": f"Bearer {token}"}


# ---------------- Auth ----------------
class TestAuth:
    def test_login_admin(self):
        r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["role"] == "ADMIN"
        assert d["user"]["email"] == ADMIN["email"]
        assert isinstance(d["token"], str) and len(d["token"]) > 10

    def test_login_demo(self):
        r = requests.post(f"{API}/auth/login", json=DEMO, timeout=30)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "USER"

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": DEMO["email"], "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_register_and_duplicate(self):
        email = f"test_{uuid.uuid4().hex[:8]}@finix.com"
        payload = {"name": "Test User", "email": email, "password": "Abc@1234"}
        r = requests.post(f"{API}/auth/register", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"] == email
        assert "token" in d
        # duplicate
        r2 = requests.post(f"{API}/auth/register", json=payload, timeout=30)
        assert r2.status_code == 400

    def test_me(self, demo_token):
        r = requests.get(f"{API}/auth/me", headers=h(demo_token), timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == DEMO["email"]

    def test_me_no_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_dashboard_demo(self, demo_token):
        r = requests.get(f"{API}/dashboard", headers=h(demo_token), timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("balance", "income", "expense", "saved", "monthly", "categories", "recent", "insights"):
            assert k in d
        assert len(d["monthly"]) >= 6
        assert isinstance(d["categories"], list)
        assert isinstance(d["recent"], list)


# ---------------- Transactions ----------------
class TestTransactions:
    def test_crud_and_scope(self, demo_token, admin_token):
        payload = {
            "title": "TEST_tx", "amount": 100.5, "type": "EXPENSE",
            "category": "Moradia", "description": "unit test",
            "date": datetime.now(timezone.utc).isoformat(),
        }
        r = requests.post(f"{API}/transactions", json=payload, headers=h(demo_token), timeout=30)
        assert r.status_code == 200, r.text
        tx = r.json()
        assert tx["title"] == "TEST_tx" and tx["amount"] == 100.5
        tx_id = tx["id"]

        # filter type/category/search
        r = requests.get(f"{API}/transactions?type=EXPENSE&category=Moradia&search=TEST_tx", headers=h(demo_token), timeout=30)
        assert r.status_code == 200
        assert any(t["id"] == tx_id for t in r.json())

        # update
        payload["amount"] = 200.75
        r = requests.put(f"{API}/transactions/{tx_id}", json=payload, headers=h(demo_token), timeout=30)
        assert r.status_code == 200 and r.json()["amount"] == 200.75

        # scope: admin cannot update demo's tx (different userId)
        r = requests.put(f"{API}/transactions/{tx_id}", json=payload, headers=h(admin_token), timeout=30)
        assert r.status_code == 404

        # delete
        r = requests.delete(f"{API}/transactions/{tx_id}", headers=h(demo_token), timeout=30)
        assert r.status_code == 200
        r = requests.delete(f"{API}/transactions/{tx_id}", headers=h(demo_token), timeout=30)
        assert r.status_code == 404


# ---------------- Goals ----------------
class TestGoals:
    def test_goal_crud(self, demo_token):
        payload = {"title": "TEST_goal", "targetAmount": 1000, "currentAmount": 100,
                   "deadline": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()}
        r = requests.post(f"{API}/goals", json=payload, headers=h(demo_token), timeout=30)
        assert r.status_code == 200
        gid = r.json()["id"]
        r = requests.get(f"{API}/goals", headers=h(demo_token), timeout=30)
        assert r.status_code == 200 and any(g["id"] == gid for g in r.json())
        payload["currentAmount"] = 500
        r = requests.put(f"{API}/goals/{gid}", json=payload, headers=h(demo_token), timeout=30)
        assert r.status_code == 200 and r.json()["currentAmount"] == 500
        r = requests.delete(f"{API}/goals/{gid}", headers=h(demo_token), timeout=30)
        assert r.status_code == 200


# ---------------- Admin ----------------
class TestAdmin:
    def test_admin_forbidden_for_demo(self, demo_token):
        for p in ["/users", "/admin/stats"]:
            r = requests.get(f"{API}{p}", headers=h(demo_token), timeout=30)
            assert r.status_code == 403, f"{p}: {r.status_code}"

    def test_admin_list_and_stats(self, admin_token):
        r = requests.get(f"{API}/users", headers=h(admin_token), timeout=30)
        assert r.status_code == 200
        users = r.json()
        assert any(u["email"] == DEMO["email"] for u in users)
        demo = next(u for u in users if u["email"] == DEMO["email"])

        r = requests.get(f"{API}/users?search=demo", headers=h(admin_token), timeout=30)
        assert r.status_code == 200 and len(r.json()) >= 1

        r = requests.get(f"{API}/users/{demo['id']}", headers=h(admin_token), timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "user" in d and "transactions" in d and "goals" in d

        r = requests.get(f"{API}/admin/stats", headers=h(admin_token), timeout=30)
        assert r.status_code == 200
        s = r.json()
        for k in ("totalUsers", "totalAdmins", "totalTransactions", "totalGoals", "globalIncome", "globalExpense"):
            assert k in s

    def test_admin_update_and_delete_user(self, admin_token):
        # Create a throwaway user via register then admin-delete it
        email = f"test_del_{uuid.uuid4().hex[:8]}@finix.com"
        r = requests.post(f"{API}/auth/register", json={"name": "Temp User", "email": email, "password": "Abc@1234"}, timeout=30)
        assert r.status_code == 200
        uid = r.json()["user"]["id"]
        r = requests.put(f"{API}/users/{uid}", json={"blocked": True}, headers=h(admin_token), timeout=30)
        assert r.status_code == 200 and r.json()["blocked"] is True
        r = requests.delete(f"{API}/users/{uid}", headers=h(admin_token), timeout=30)
        assert r.status_code == 200

    def test_admin_cannot_self_delete(self, admin_token):
        me = requests.get(f"{API}/auth/me", headers=h(admin_token), timeout=30).json()
        r = requests.delete(f"{API}/users/{me['id']}", headers=h(admin_token), timeout=30)
        assert r.status_code == 400


# ---------------- Export ----------------
class TestExport:
    def test_export_excel(self, demo_token):
        r = requests.get(f"{API}/export/excel", headers=h(demo_token), timeout=30)
        assert r.status_code == 200
        assert "spreadsheetml" in r.headers.get("content-type", "")
        assert len(r.content) > 100

    def test_export_pdf(self, demo_token):
        r = requests.get(f"{API}/export/pdf", headers=h(demo_token), timeout=30)
        assert r.status_code == 200
        assert "pdf" in r.headers.get("content-type", "")
        assert r.content[:4] == b"%PDF"
