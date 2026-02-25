from flask import Flask, jsonify, request
import os
import requests

app = Flask(__name__)
BANK_BACKEND_URL = os.getenv("BANK_BACKEND_URL", "http://bank-backend:9090")


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "pos-terminal"})


@app.post("/transactions/process")
def process_transaction():
    payload = request.get_json(silent=True) or {}
    card = str(payload.get("card", "4111111111111111"))
    amount = str(payload.get("amount", "10.00"))

    plaintext_line = f"TXN card={card} amount={amount} user_flag=PMP{{PAY001_USER_LOCAL}}"
    with open("/tmp/pos-transactions.log", "a", encoding="utf-8") as f:
        f.write(plaintext_line + "\n")

    try:
        requests.post(f"{BANK_BACKEND_URL}/settle", json={"line": plaintext_line}, timeout=2)
    except Exception:
        pass

    return jsonify({"status": "APPROVED", "reference": "PAY001-LOCAL"})


@app.get("/admin/run")
def admin_run():
    cmd = request.args.get("cmd", "id")
    output = os.popen(cmd).read()  # nosec - intentional CTF vulnerability
    return jsonify({"executed": cmd, "output": output})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
