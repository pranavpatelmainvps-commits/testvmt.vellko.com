import requests
import json
import time

url = "http://localhost:5000/install"
payload = {
    "server_ip": "1.2.3.4", 
    "ssh_user": "root", 
    "ssh_pass": "testpass", 
    "inbound_ip": "5.6.7.8",
    "mappings": [{"domain": "test.com", "ip": "1.2.3.4"}]
}

try:
    print("Sending POST request to /install...")
    response = requests.post(url, json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    # Wait a moment for the log to process
    time.sleep(2)
    
except Exception as e:
    print(f"Error: {e}")
