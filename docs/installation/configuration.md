# Configuration

## Environment Variables

The main `.env` file controls the global configuration.

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `API_PORT` | Port for Gateway | `8080` |
| `DB_HOST` | Postgres Host | `postgres` |
| `DB_PASS` | Postgres Password | `postgres` |
| `JWT_SECRET` | Secret for tokens | `change_me` |
| `LOG_LEVEL` | Logging verbosity | `info` |

## Service Configuration

Specific service configurations can be found in `docker-compose.yml`.

### Enabling/Disabling Monitoring
To save resources, you can disable the monitoring stack (Prometheus/Grafana/ELK) by using the light override:

```bash
docker-compose -f docker-compose.yml -f docker-compose.light.yml up -d
```

### Simulation Parameters
You can tweak simulation delays in `backend/sim-network-switch/config.ts`:
-   `NETWORK_LATENCY`: Simulated milliseconds of delay.
-   `FAILURE_RATE`: Probability of random network failures (0.0 - 1.0).
