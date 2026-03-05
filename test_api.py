import time
import requests

BASE_URL = "http://127.0.0.1:5000"
creds = {"email": "test@example.com", "password": "password123"}

print("==> Logging in...")
res = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
print(res.status_code, res.json())

token = res.json().get('token')
headers = {"Authorization": f"Bearer {token}"}

payload = {
    "server_ip": "192.119.169.5",
    "ssh_user": "root",
    "ssh_pass": "cG730t*%?2fM", 
    "ssh_port": 22,
    "mappings": [
         {"ip": "192.119.169.123", "domain": "quicklendings.com"},
         {"ip": "192.119.169.124", "domain": "tommorrow-loan.com"}
    ]
}

print("==> Starting Installation via API...")
res_install = requests.post(f"{BASE_URL}/install", headers=headers, json=payload)
print("Install Initialized:", res_install.status_code)

if res_install.status_code == 200:
    print("Installation trigger sent. Polling logs for 20 seconds...")
    for _ in range(10):
        time.sleep(2)
        log_res = requests.get(f"{BASE_URL}/install_logs", headers=headers)
        if log_res.status_code == 200:
            print("LOG POLL:", log_res.json().get('logs', '')[-200:])
        else:
            print("Log polling error:", log_res.status_code)
