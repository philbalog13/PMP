import requests
import json
import os

services = {
    8000: ("api-gateway", "/health"),
    8001: ("sim-card-service", "/health"),
    8002: ("sim-pos-service", "/health"),
    8003: ("sim-acquirer-service", "/health"),
    8004: ("sim-network-switch", "/health"),
    8005: ("sim-issuer-service", "/health"),
    8006: ("sim-auth-engine", "/health"),
    8007: ("sim-fraud-detection", "/health"),
    8010: ("crypto-service", "/health"),
    8011: ("hsm-simulator", "/hsm/health"),
    8012: ("key-management", "/api/health")
}

results = []

for port, (name, endpoint) in services.items():
    url = f"http://localhost:{port}{endpoint}"
    try:
        response = requests.get(url, timeout=1)
        status = "UP" if response.status_code == 200 else f"HTTP {response.status_code}"
    except Exception as e:
        status = "DOWN"
    
    results.append({"port": port, "service": name, "status": status, "url": url})

with open('health_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print("Health check completed. Results saved to health_results.json")
