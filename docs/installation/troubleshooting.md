# Troubleshooting

## Common Issues

### 1. Ports Already in Use

**Error**: `Bind for 0.0.0.0:8080 failed: port is already allocated`

**Fix**:
Identify what is using the port:
```bash
# Windows
netstat -ano | findstr :8080
# Linux
lsof -i :8080
```
Change the port in `.env` or stop the conflicting application.

### 2. Database Connection Refused

**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Fix**:
This usually happens if containers start too fast before the DB is ready. The services have a retry mechanism, so wait 30 seconds.
If it persists check if the volume is corrupted:
```bash
docker-compose down -v
docker-compose up -d
```

### 3. Frontend "Network Error"

**Symptom**: TPE cannot connect to backend.

**Fix**:
Ensure CORS is configured to allow your origin. In `backend/api-gateway/.env`:
```
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

### 4. Docker Memory Limit

**Symptom**: Containers exit with Code 137 (OOM).

**Fix**:
Increase Docker memory limit in Docker Desktop settings > Resources > Memory (Set to at least 4GB).
