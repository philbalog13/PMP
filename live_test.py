import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def call_api(path, data=None, method='GET'):
    url = f"{BASE_URL}{path}"
    req = urllib.request.Request(url, method=method)
    req.add_header('Content-Type', 'application/json')
    
    body = None
    if data is not None:
        body = json.dumps(data).encode('utf-8')
    
    try:
        with urllib.request.urlopen(req, data=body, timeout=10) as response:
            res_body = response.read().decode('utf-8')
            return json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        res_body = e.read().decode('utf-8')
        try:
            return {"error": str(e), "body": json.loads(res_body)}
        except:
            return {"error": str(e), "raw_body": res_body}
    except Exception as e:
        return {"error": str(e)}

print("--- PMP LIVE TRANSACTION FLOW TEST ---")

# 1. Health
print("1. Checking Status...")
health = call_api("/api/health")
print(f"   Gateway Status: {health.get('status', 'N/A')}")

# 2. Card Creation
print("2. Creating Card...")
card_req = {"cardholderName": "LIVE TEST", "cardType": "VISA", "balance": 1000}
res = call_api("/api/cards", data=card_req, method='POST')

if not res.get('success'):
    print(f"   FAILED: {res}")
    exit(1)

card = res['data']
pan = card['pan']
cvv = card['cvv']
expiry_month = card['expiryMonth']
expiry_year = card['expiryYear']
card_id = card['id']
print(f"   SUCCESS: PAN={pan}, CVV={cvv}, EXP={expiry_month}/{expiry_year}")

# 3. Transaction
print("3. Submitting Transaction (55.50 EUR)...")
tx_data = {
    "merchantId": "MERCHANT001",
    "terminalId": "TERM_LIVE_01",
    "amount": 55.50,
    "currency": "EUR",
    "pan": pan,
    "expiryMonth": expiry_month,
    "expiryYear": expiry_year,
    "cvv": cvv,
    "pin": "1234"
}

start = time.time()
res = call_api("/api/transactions", data=tx_data, method='POST')
duration = int((time.time() - start) * 1000)

if 'body' in res: res = res['body']

tx_res = res.get('data', {})
status = tx_res.get('status', 'UNKNOWN')
auth_code = tx_res.get('authorizationCode', 'N/A')
print(f"   Response Status: {status}")
print(f"   Auth Code: {auth_code}")
print(f"   Message: {res.get('message', 'N/A') if 'message' in res else tx_res.get('responseCode', 'N/A')}")
print(f"   Total Phase: {duration}ms")

# 4. Final Validation
if status == 'APPROVED':
    print("4. Final Balance Check...")
    card_info = call_api(f"/api/cards/{pan}")
    balance = card_info.get('data', {}).get('balance', 'N/A')
    print(f"   Card Balance: {balance} EUR")
    print("\nSUCCESS: End-to-end workflow validated.")
else:
    print(f"FAILED: Transaction {status}")
    print(f"Details: {res}")

print("--------------------------------------")
