# HSM Simulator (Hardware Security Module)

Educational HSM simulator used by PMP services (`issuer`, `gateway`, `hsm-web`) for key-backed crypto operations.

## Run

```bash
npm install
npm run build
npm run dev
```

Environment variables:

- `HSM_PORT` or `PORT`: service port (default `8011`)
- `HSM_BOOTSTRAP_KEYS`: optional JSON object of additional startup keys

Example:

```json
{
  "ZAK_010": { "type": "ZAK", "value": "00112233445566778899AABBCCDDEEFF" }
}
```

## API Endpoints

### Health

- `GET /health`
- `GET /hsm/health`

### PIN Operations

- `POST /hsm/encrypt-pin`
- `POST /hsm/decrypt-pin`

### MAC Operations

- `POST /hsm/generate-mac` (hex or utf8 input)
- `POST /hsm/verify-mac`

### Key/Data Operations

- `POST /hsm/translate-key`
- `POST /hsm/encrypt-data`
- `POST /hsm/calculate-kcv`
- `POST /hsm/generate-cvv`

### Admin/Runtime

- `GET /hsm/keys`
- `GET /hsm/status`
- `GET /hsm/config`
- `POST /hsm/config` (vuln config, tamper simulation/reset, key reload)

## Notes

- Includes default keys required by current issuer flow (`ZAK_002`, `ZEK_001`).
- Tamper mode zeroizes keys and blocks crypto commands until reset.
- Built for simulation/learning, not for PCI production use.
