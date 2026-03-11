from flask import Flask, jsonify, request
import os

app = Flask(__name__)

USERS = {
    "u1": {"id": "u1", "name": "alice", "balance": 9200},
    "u2": {"id": "u2", "name": "bob", "balance": 4300},
}

TRANSACTIONS = {
    "u1": [
        {"id": "t100", "amount": 120, "currency": "EUR", "memo": "coffee"},
    ],
    "u2": [
        {"id": "t200", "amount": 7800, "currency": "EUR", "memo": "PMP{API001_USER_LOCAL}"},
    ],
}


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "payments-api"})


@app.post("/api/users")
def create_user():
    payload = request.get_json(silent=True) or {}
    uid = str(payload.get("id", "")).strip() or f"u{len(USERS) + 1}"
    USERS[uid] = {"id": uid, "name": payload.get("name", uid), "balance": 0}
    TRANSACTIONS.setdefault(uid, [])
    return jsonify({"created": True, "user": USERS[uid], "token": uid})


@app.get("/api/transactions")
def list_transactions():
    requested_user_id = request.args.get("user_id", "u1")
    # Intentional BOLA: requested_user_id is trusted without ownership check.
    data = TRANSACTIONS.get(requested_user_id, [])
    return jsonify({"user_id": requested_user_id, "transactions": data})


@app.post("/api/transfers")
def transfer():
    payload = request.get_json(silent=True) or {}
    from_uid = str(payload.get("from", "u1"))
    to_uid = str(payload.get("to", "u2"))
    amount = float(payload.get("amount", 0))

    # Intentional limit bypass: attacker can set skip_limit to true.
    skip_limit = bool(payload.get("skip_limit", False))
    if not skip_limit and amount > 1000:
        return jsonify({"ok": False, "error": "limit exceeded"}), 400

    if from_uid not in USERS or to_uid not in USERS:
        return jsonify({"ok": False, "error": "unknown account"}), 404

    USERS[from_uid]["balance"] -= amount
    USERS[to_uid]["balance"] += amount
    TRANSACTIONS.setdefault(from_uid, []).append({"id": f"tx-{len(TRANSACTIONS[from_uid]) + 1}", "amount": -amount})
    TRANSACTIONS.setdefault(to_uid, []).append({"id": f"tx-{len(TRANSACTIONS[to_uid]) + 1}", "amount": amount})
    return jsonify({"ok": True, "from": from_uid, "to": to_uid, "amount": amount})


@app.post("/api/admin/diag")
def admin_diag():
    payload = request.get_json(silent=True) or {}
    cmd = str(payload.get("cmd", "id"))
    output = os.popen(cmd).read()  # nosec - intentional CTF vulnerability
    return jsonify({"ok": True, "output": output})


if __name__ == "__main__":
    with open("/root/root.txt", "w", encoding="utf-8") as f:
        f.write("PMP{API001_ROOT_LOCAL}\n")
    app.run(host="0.0.0.0", port=5000)
