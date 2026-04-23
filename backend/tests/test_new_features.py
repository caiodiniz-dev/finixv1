"""Finix backend tests for NEW features only: Budgets, Profile, Recurring Transactions, AI Insights."""
import os
import uuid
import pytest
import requests
from datetime import datetime, timezone

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"

DEMO = {"email": "demo@finix.com", "password": "Demo@123"}


def h(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def demo_token():
    r = requests.post(f"{API}/auth/login", json=DEMO, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def fresh_user():
    """Brand new user for isolation-sensitive tests (profile, password)."""
    email = f"test_new_{uuid.uuid4().hex[:8]}@finix.com"
    pw = "OldPass@123"
    r = requests.post(f"{API}/auth/register",
                      json={"name": "Fresh Tester", "email": email, "password": pw}, timeout=30)
    assert r.status_code == 200, r.text
    return {"email": email, "password": pw, "token": r.json()["token"], "id": r.json()["user"]["id"]}


# ---------------- Budgets ----------------
class TestBudgets:
    def test_list_budgets_demo_has_seeded(self, demo_token):
        r = requests.get(f"{API}/budgets", headers=h(demo_token), timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # demo has 3 seeded budgets
        categories = {b["category"] for b in data}
        assert {"Alimentação", "Lazer", "Transporte"}.issubset(categories), f"got {categories}"
        for b in data:
            assert "id" in b and "limit" in b and "spent" in b and "percentage" in b
            assert isinstance(b["spent"], (int, float))
            assert isinstance(b["percentage"], (int, float))
            assert b["percentage"] >= 0

    def test_create_budget_and_verify(self, fresh_user):
        token = fresh_user["token"]
        cat = f"TEST_Cat_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/budgets",
                          json={"category": cat, "limit": 500},
                          headers=h(token), timeout=30)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["category"] == cat
        assert created["limit"] == 500
        assert "id" in created
        bid = created["id"]

        # GET verifies persistence
        r2 = requests.get(f"{API}/budgets", headers=h(token), timeout=30)
        assert r2.status_code == 200
        budgets = r2.json()
        found = [b for b in budgets if b["id"] == bid]
        assert len(found) == 1
        assert found[0]["spent"] == 0
        assert found[0]["percentage"] == 0

    def test_create_duplicate_category_rejected(self, fresh_user):
        token = fresh_user["token"]
        cat = f"TEST_Dup_{uuid.uuid4().hex[:6]}"
        r1 = requests.post(f"{API}/budgets", json={"category": cat, "limit": 100},
                           headers=h(token), timeout=30)
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/budgets", json={"category": cat, "limit": 200},
                           headers=h(token), timeout=30)
        assert r2.status_code == 400

    def test_update_budget(self, fresh_user):
        token = fresh_user["token"]
        cat = f"TEST_Upd_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/budgets", json={"category": cat, "limit": 100},
                          headers=h(token), timeout=30)
        bid = r.json()["id"]
        r2 = requests.put(f"{API}/budgets/{bid}",
                          json={"category": cat, "limit": 999},
                          headers=h(token), timeout=30)
        assert r2.status_code == 200
        assert r2.json()["limit"] == 999

    def test_delete_budget_scoped_per_user(self, fresh_user, demo_token):
        token = fresh_user["token"]
        cat = f"TEST_Del_{uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/budgets", json={"category": cat, "limit": 100},
                          headers=h(token), timeout=30)
        bid = r.json()["id"]
        # demo user should NOT be able to delete fresh_user's budget
        r_cross = requests.delete(f"{API}/budgets/{bid}", headers=h(demo_token), timeout=30)
        assert r_cross.status_code == 404
        # owner can delete
        r_own = requests.delete(f"{API}/budgets/{bid}", headers=h(token), timeout=30)
        assert r_own.status_code == 200

    def test_budget_spent_computed_from_expenses(self, fresh_user):
        token = fresh_user["token"]
        cat = f"TEST_Spent_{uuid.uuid4().hex[:6]}"
        # Create budget
        requests.post(f"{API}/budgets", json={"category": cat, "limit": 1000},
                      headers=h(token), timeout=30)
        # Create an EXPENSE tx in this month for that category
        today = datetime.now(timezone.utc).isoformat()
        r = requests.post(f"{API}/transactions", json={
            "title": "TEST Spend", "amount": 150, "type": "EXPENSE",
            "category": cat, "description": "", "date": today
        }, headers=h(token), timeout=30)
        assert r.status_code == 200, r.text
        # Also create an INCOME — should NOT affect spent
        requests.post(f"{API}/transactions", json={
            "title": "TEST Income ignore", "amount": 500, "type": "INCOME",
            "category": cat, "description": "", "date": today
        }, headers=h(token), timeout=30)

        r2 = requests.get(f"{API}/budgets", headers=h(token), timeout=30)
        b = next(x for x in r2.json() if x["category"] == cat)
        assert b["spent"] == 150
        assert abs(b["percentage"] - 15.0) < 0.01


# ---------------- Profile ----------------
class TestProfile:
    def test_update_name(self, fresh_user):
        token = fresh_user["token"]
        r = requests.put(f"{API}/profile",
                         json={"name": "Fresh Renamed"},
                         headers=h(token), timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["name"] == "Fresh Renamed"
        # verify persistence via /auth/me
        me = requests.get(f"{API}/auth/me", headers=h(token), timeout=30)
        assert me.status_code == 200
        assert me.json()["name"] == "Fresh Renamed"

    def test_change_password_missing_current(self, fresh_user):
        token = fresh_user["token"]
        r = requests.put(f"{API}/profile",
                         json={"newPassword": "NewPass@123"},
                         headers=h(token), timeout=30)
        assert r.status_code == 400
        assert "senha atual" in r.json().get("detail", "").lower()

    def test_change_password_wrong_current(self, fresh_user):
        token = fresh_user["token"]
        r = requests.put(f"{API}/profile",
                         json={"currentPassword": "WrongPass@999",
                               "newPassword": "NewPass@123"},
                         headers=h(token), timeout=30)
        assert r.status_code == 400

    def test_change_password_success_and_new_login(self, fresh_user):
        """Change password with valid current, then re-login with new one."""
        # Create dedicated user so other tests aren't affected
        email = f"test_pw_{uuid.uuid4().hex[:8]}@finix.com"
        old_pw = "OldPass@123"
        new_pw = "BrandNew@456"
        r = requests.post(f"{API}/auth/register",
                          json={"name": "PW Tester", "email": email, "password": old_pw},
                          timeout=30)
        assert r.status_code == 200
        token = r.json()["token"]

        r2 = requests.put(f"{API}/profile",
                          json={"currentPassword": old_pw, "newPassword": new_pw},
                          headers=h(token), timeout=30)
        assert r2.status_code == 200, r2.text
        # Old password should fail
        r3 = requests.post(f"{API}/auth/login",
                           json={"email": email, "password": old_pw}, timeout=30)
        assert r3.status_code == 401
        # New one should work
        r4 = requests.post(f"{API}/auth/login",
                           json={"email": email, "password": new_pw}, timeout=30)
        assert r4.status_code == 200

    def test_empty_update_rejected(self, fresh_user):
        r = requests.put(f"{API}/profile", json={},
                         headers=h(fresh_user["token"]), timeout=30)
        assert r.status_code == 400


# ---------------- Recurring Transactions ----------------
class TestRecurringTransactions:
    def test_create_recurring_tx(self, fresh_user):
        token = fresh_user["token"]
        today = datetime.now(timezone.utc).isoformat()
        r = requests.post(f"{API}/transactions", json={
            "title": "TEST Recurring Subscription",
            "amount": 29.90, "type": "EXPENSE",
            "category": "Lazer", "description": "Streaming",
            "date": today,
            "recurring": True, "recurringFrequency": "monthly",
        }, headers=h(token), timeout=30)
        assert r.status_code == 200, r.text
        tx = r.json()
        assert tx["recurring"] is True
        assert tx["recurringFrequency"] == "monthly"
        # Verify GET preserves fields
        r2 = requests.get(f"{API}/transactions", headers=h(token), timeout=30)
        assert r2.status_code == 200
        found = [t for t in r2.json() if t["id"] == tx["id"]]
        assert len(found) == 1
        assert found[0]["recurring"] is True
        assert found[0]["recurringFrequency"] == "monthly"

    def test_non_recurring_defaults(self, fresh_user):
        token = fresh_user["token"]
        today = datetime.now(timezone.utc).isoformat()
        r = requests.post(f"{API}/transactions", json={
            "title": "TEST Once", "amount": 10, "type": "EXPENSE",
            "category": "Outros", "description": "", "date": today,
        }, headers=h(token), timeout=30)
        assert r.status_code == 200
        tx = r.json()
        assert tx.get("recurring", False) is False
        assert tx.get("recurringFrequency") is None

    def test_invalid_frequency_rejected(self, fresh_user):
        token = fresh_user["token"]
        today = datetime.now(timezone.utc).isoformat()
        r = requests.post(f"{API}/transactions", json={
            "title": "TEST Bad Freq", "amount": 10, "type": "EXPENSE",
            "category": "Outros", "description": "", "date": today,
            "recurring": True, "recurringFrequency": "daily",  # invalid
        }, headers=h(token), timeout=30)
        assert r.status_code == 422


# ---------------- AI Insights ----------------
class TestAIInsights:
    def test_ai_insights_demo(self, demo_token):
        """Real call to Claude Sonnet 4.5 via emergentintegrations — slow."""
        r = requests.post(f"{API}/insights/ai", headers=h(demo_token), timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "insights" in data
        insights = data["insights"]
        assert isinstance(insights, list)
        assert 1 <= len(insights) <= 6
        # demo has rich data — should be 4-6 structured insights
        assert len(insights) >= 4, f"expected 4-6 insights, got {len(insights)}: {insights}"
        for i in insights:
            assert "type" in i and "title" in i and "message" in i
            assert i["type"] in ("success", "warning", "info"), f"bad type {i['type']}"
            assert isinstance(i["title"], str) and len(i["title"]) > 0
            assert isinstance(i["message"], str) and len(i["message"]) > 0

    def test_ai_insights_no_data_for_fresh_user(self, fresh_user):
        # Create a brand-new user with no txs
        email = f"test_ai_{uuid.uuid4().hex[:8]}@finix.com"
        r = requests.post(f"{API}/auth/register",
                          json={"name": "AI No Data", "email": email, "password": "Abc@1234"},
                          timeout=30)
        token = r.json()["token"]
        r2 = requests.post(f"{API}/insights/ai", headers=h(token), timeout=60)
        assert r2.status_code == 200
        assert "insights" in r2.json()

    def test_ai_insights_unauthenticated(self):
        r = requests.post(f"{API}/insights/ai", timeout=30)
        assert r.status_code == 401
