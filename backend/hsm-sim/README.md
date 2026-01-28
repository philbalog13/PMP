# HSM Simulator (Hardware Security Module)

A simulated HSM for educational purposes, permitting cryptographic operations and key management via REST API.

## API Endpoints

### PIN Operations
- `POST /hsm/encrypt-pin`: Encrypt a clear PIN using a ZPK.

### MAC Operations
- `POST /hsm/generate-mac`: Generate a MAC (ISO 9797 Alg 3 or Alg 1).
- `POST /hsm/verify-mac`: Verify a MAC.

### Key Management
- `POST /hsm/translate-key`: Translate a key from one Zone Key to another (or to LMK).

## Configuration

Environment variables:
- `HSM_PORT`: Port to listen on (default 3004).
- `VULN_ENABLED`: Enable vulnerability engine.

## Vulnerability Engine

The simulator includes a `VulnEngine` to enable:
- Weak Keys
- Key Leaks (in logs)
- Replay Attacks (permissive check)

Enable these via the Web Admin Interface.
