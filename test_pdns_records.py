import requests, json
key = "MyDNSApiKey2026"
r = requests.get("http://192.119.169.12:8081/api/v1/servers/localhost/zones", headers={"X-API-Key": key})
zones = r.json()
print("ZONES:", [z['name'] for z in zones])

# Let's check records for quicklendings.com
for z in zones:
    if 'quicklendings' in z['name'] or 'tommorrow' in z['name']:
        print(f"\n--- Records for {z['name']} ---")
        zdata = requests.get(f"http://192.119.169.12:8081/api/v1/servers/localhost/zones/{z['name']}", headers={"X-API-Key": key}).json()
        for rrset in zdata.get('rrsets', []):
            print(f"{rrset['name']:<30} {rrset['type']:<5} {rrset['records']}")
