from flask import Flask, jsonify
import os
import requests

app = Flask(__name__)
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8081")
CORE_URL = os.getenv("CORE_URL", "http://core:8082")


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "dora-frontend"})


@app.get("/status")
def status():
    backend = requests.get(f"{BACKEND_URL}/status", timeout=2).json()
    core = requests.get(f"{CORE_URL}/status", timeout=2).json()
    return jsonify({"backend": backend, "core": core})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
