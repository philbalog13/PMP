from flask import Flask, jsonify, request
import sqlite3
import os

DB_PATH = "/tmp/pci001.db"
app = Flask(__name__)


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT, price REAL)")
    cur.execute("CREATE TABLE IF NOT EXISTS cards (id INTEGER PRIMARY KEY, holder TEXT, card_number TEXT, note TEXT)")
    cur.execute("DELETE FROM products")
    cur.execute("DELETE FROM cards")
    cur.executemany("INSERT INTO products(name, price) VALUES(?, ?)", [
        ("terminal", 89.0),
        ("printer", 59.0),
        ("scanner", 39.0),
    ])
    cur.executemany("INSERT INTO cards(holder, card_number, note) VALUES(?, ?, ?)", [
        ("Alice", "4242424242424242", "test card"),
        ("Bob", "5555555555554444", "PMP{PCI001_USER_LOCAL}"),
    ])
    conn.commit()
    conn.close()


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "pci-web"})


@app.get("/search")
def search():
    q = request.args.get("q", "")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    query = f"SELECT id, name, price FROM products WHERE name LIKE '%{q}%'"  # nosec - intentional SQLi
    rows = []
    try:
        rows = cur.execute(query).fetchall()
    except Exception as exc:
        rows = [["error", str(exc), 0]]
    conn.close()
    return jsonify({"query": query, "rows": rows})


@app.get("/admin/read")
def admin_read():
    path = request.args.get("file", "/etc/hostname")
    if not path:
        return jsonify({"error": "file required"}), 400
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        return jsonify({"file": path, "content": content})
    except Exception as exc:
        return jsonify({"file": path, "error": str(exc)}), 500


if __name__ == "__main__":
    init_db()
    with open("/root/root.txt", "w", encoding="utf-8") as f:
        f.write("PMP{PCI001_ROOT_LOCAL}\n")
    app.run(host="0.0.0.0", port=8080)
