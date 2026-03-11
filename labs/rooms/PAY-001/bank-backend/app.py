from flask import Flask, jsonify, request

app = Flask(__name__)


@app.post("/settle")
def settle():
    payload = request.get_json(silent=True) or {}
    line = payload.get("line", "")
    return jsonify({"settled": True, "line": line})


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "bank-backend"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9090)
