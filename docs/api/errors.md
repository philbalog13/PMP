# Error Codes

We map ISO 8583 response codes (Field 39) to HTTP Status Codes where meaningful, but the JSON body always contains the functional ISO code.

| ISO Code | Meaning | HTTP Status | Action |
|----------|---------|-------------|--------|
| `00` | Approved | 200 OK | Dispense goods |
| `05` | Do Not Honor | 402 Payment Required | Generic decline |
| `51` | Insufficient Funds | 402 Payment Required | Ask for other card |
| `54` | Expired Card | 400 Bad Request | Check expiry |
| `55` | Incorrect PIN | 401 Unauthorized | Retry PIN (max 3) |
| `91` | Issuer Inoperative | 503 Service Unavailable | Retry later |
| `96` | System Error | 500 Internal Error | Contact support |
