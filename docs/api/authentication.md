# Authentication

## JWT (JSON Web Tokens)

The API uses Bearer Auth.

**Header**:
`Authorization: Bearer <your_token>`

### Obtaining a Token
Use the `/auth/login` endpoint with simulated credentials:
-   **Username**: `admin`
-   **Password**: `admin123`

## mTLS (Simulated)

For inter-service communication (e.g., Gateway -> Switch), we simulate Mutual TLS by checking specific headers:

-   `X-Service-ID`: Name of calling service.
-   `X-Service-Signature`: HMAC signature of the body.
