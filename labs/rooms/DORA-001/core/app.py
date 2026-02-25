from flask import Flask, jsonify

app = Flask(__name__)
LOCKED = False


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "dora-core"})


@app.get("/status")
def status():
    return jsonify({"locked": LOCKED})


@app.post("/core/lock")
def lock_core():
    global LOCKED
    LOCKED = True
    return jsonify({"locked": True})


@app.post("/core/restore")
def restore_core():
    global LOCKED
    LOCKED = False
    return jsonify({"locked": False})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8082)
