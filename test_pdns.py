import requests
key = "MyDNSApiKey2026"
print("Testing Key:", key)
try:
    r = requests.get("http://192.119.169.12:8081/api/v1/servers/localhost/zones", headers={"X-API-Key": key})
    print(r.status_code, r.text[:100])
except Exception as e:
    print("Error:", e)
