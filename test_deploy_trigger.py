import requests
import json
import time

url = "http://127.0.0.1:5000/install"

payload = {
    "server_ip": "192.119.169.5",  # Using the Client IP from previous logs
    "ssh_user": "root",
    "ssh_pass": "dummy_pass_since_we_cant_ssh_real_client", # This will fail SSH to Client Likely
    "mappings": [
         {"domain": "test.com", "ip": "192.119.169.5"}
    ],
    "smtp_user": {"username": "admin", "password": "password"},
    "fresh_install": False
}

print(f"Sending install request to {url}...")
try:
    r = requests.post(url, json=payload)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text}")
except Exception as e:
    print(f"Request failed: {e}")

# Now poll logs
print("\nPolling logs...")
for _ in range(10):
    time.sleep(2)
    try:
        r = requests.get("http://127.0.0.1:5000/install_logs")
        print("\n--- LOGS CHECK ---")
        print(r.text[-500:]) # Print last 500 chars
    except:
        pass
