# API Reference

## Base URL
`http://localhost:8080/api/v1`

## Content Type
All requests and responses are `application/json`.

## Endpoints

### Auth
-   `POST /auth/login` - Authenticate TPE or Admin.
-   `POST /auth/refresh` - Refresh JWT token.

### Transaction
-   `POST /transaction/init` - Initiate a payment.
    -   **Body**: `{ amount, currency, pan, expiry, pinBlock }`
    -   **Response**: `{ status, responseCode, authCode }`
-   `GET /transaction/:id` - Get status.

### Admin
-   `GET /admin/stats` - Dashboard metrics.
-   `GET /admin/logs` - System audit logs.
