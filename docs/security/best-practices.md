# Security Best Practices

## Data Protection

1.  **PAN Masking**:
    -   Never log the full PAN (Primary Account Number).
    -   Log mask: `411111******1111`.
    -   Implemented in: `backend/common/logger.ts`.

2.  **PIN Handling**:
    -   PINs are never stored.
    -   PINs are encrypted immediately at the TPE (using simulated Key Injection).
    -   Only decrypted inside the ephemeral memory of the `HSM-Simulator`.

3.  **Key Management**:
    -   Keys are rotated every 24h (Simulated).
    -   Master Keys (LMK) are distinct from Session Keys (ZPK).

## Secure Configuration

-   **No Defaults**: Change `JWT_SECRET` in production `.env`.
-   **Least Privilege**: Docker containers run as non-root users (simulated user `node`).
-   **Sanitization**: SQL-injection resistance is verified with the live suite `tests/security/penetration/sql-injection.test.ts`; pedagogical mock regressions stay isolated under `tests/security/`.

## Compliance (Pedagogical)

While this is a simulator, we follow PCI-DSS principles:

-   **Req 3**: Protect stored cardholder data (We assume database encryption).
-   **Req 4**: Encrypt transmission (We simulate TLS).
-   **Req 10**: Track and monitor all access (We use Audit Logs).
