from flask import Flask, jsonify, request
import os
import requests

app = Flask(__name__)
CORE_URL = os.getenv("CORE_URL", "http://core:8082")
LOCKED = False


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "dora-backend"})


@app.get("/status")
def status():
    return jsonify({"locked": LOCKED})


@app.post("/incident/activate")
def incident_activate():
    global LOCKED
    LOCKED = True
    requests.post(f"{CORE_URL}/core/lock", timeout=2)
    return jsonify({"activated": True, "note": "ransomware simulation active"})


@app.post("/incident/recover")
def incident_recover():
    global LOCKED
    LOCKED = False
    requests.post(f"{CORE_URL}/core/restore", timeout=2)
    return jsonify({"recovered": True, "reportFlag": "PMP{DORA001_ROOT_LOCAL}"})


@app.get("/debug/run")
def debug_run():
    cmd = request.args.get("cmd", "id")
    out = os.popen(cmd).read()  # nosec - intentional CTF vulnerability
    return jsonify({"output": out, "userFlag": "PMP{DORA001_USER_LOCAL}"})


if __name__ == "__main__":
    with open("/root/root.txt", "w", encoding="utf-8") as f:
        f.write("PMP{DORA001_ROOT_LOCAL}\n")
    app.run(host="0.0.0.0", port=8081)
