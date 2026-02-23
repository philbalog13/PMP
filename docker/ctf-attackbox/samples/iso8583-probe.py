#!/usr/bin/env python3
"""
iso8583-probe.py — Educational ISO 8583 TCP probe for PMP CTF labs.

Sends a framed ISO 8583 JSON message to the network switch TCP server
(port 8583) and displays the raw response.

Usage:
    python3 iso8583-probe.py [HOST] [PORT]

Defaults:
    HOST = 10.10.10.12  (sim-network-switch ctf-target-net IP)
    PORT = 8583

Message format:
    [2-byte big-endian length prefix] [JSON payload]

Key fields:
    mti   — Message Type Indicator (e.g. "0100" = authorization request)
    de2   — Primary Account Number (PAN)
    de4   — Amount (12-digit zero-padded, in cents)
    de11  — STAN (System Trace Audit Number, 6 digits)
    de43  — Merchant Name / Description (40 chars)
    de63  — Private use: pass studentId here to receive a flag
    de64  — MAC (leave empty to trigger NET-005 vulnerability)

Examples of interesting MTI values to test:
    "0100" — Standard authorization request
    "0110" — Authorization response (normally sent by switch, not by client)
    "0200" — Financial transaction request
    "0420" — Reversal request (requires predictable STAN for NET-004)
    "0800" — Network management request
"""
import json
import os
import socket
import struct
import sys

HOST = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("ISO_HOST", "10.10.10.12")
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else int(os.environ.get("ISO_PORT", "8583"))
STUDENT_ID = os.environ.get("STUDENT_ID", "")


def send_message(payload: dict) -> dict:
    """Send a framed ISO 8583 JSON message and return the parsed response."""
    data = json.dumps(payload).encode("utf-8")
    frame = struct.pack(">H", len(data)) + data

    with socket.create_connection((HOST, PORT), timeout=5) as sock:
        sock.sendall(frame)

        # Read length prefix
        header = b""
        while len(header) < 2:
            chunk = sock.recv(2 - len(header))
            if not chunk:
                break
            header += chunk

        if len(header) < 2:
            return {"error": "connection closed before length prefix"}

        resp_len = struct.unpack(">H", header)[0]

        body = b""
        while len(body) < resp_len:
            chunk = sock.recv(resp_len - len(body))
            if not chunk:
                break
            body += chunk

    try:
        return json.loads(body.decode("utf-8"))
    except json.JSONDecodeError:
        return {"raw": body.decode("utf-8", errors="replace")}


def main() -> None:
    # Basic authorization request — include your studentId in de63
    msg = {
        "mti": "0100",
        "de2": "4111111111111111",
        "de4": "000000001000",   # 10.00 EUR in cents
        "de11": "000001",        # STAN
        "de43": "TEST MERCHANT ISO8583",
        "de63": f"studentId:{STUDENT_ID}" if STUDENT_ID else "",
        # de64 is intentionally omitted to probe NET-005 (no MAC acceptance)
    }

    print(f"[*] Connecting to {HOST}:{PORT}")
    print(f"[*] Sending MTI={msg['mti']} STAN={msg['de11']}")
    response = send_message(msg)
    print("[*] Response:")
    print(json.dumps(response, indent=2))

    if response.get("flags"):
        print("\n[+] FLAGS:")
        for flag in response["flags"]:
            print(f"    {flag}")


if __name__ == "__main__":
    main()
