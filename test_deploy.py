import sys, time
sys.path.insert(0, '/app')
from backend import app

ctx = app.app_context()
ctx.push()
client = app.test_client()

r = client.post('/api/auth/login', json={
    'email': 'pranavpatel.mainvps@gmail.com',
    'password': 'Stoneheart@24'
})
data = r.get_json()
token = data.get('token') or data.get('access_token')

if not token:
    print("Failed to get token:", data)
    sys.exit(1)

headers = {'Authorization': f'Bearer {token}'}

install_data = {
    'server_ip': '192.119.169.5',
    'ssh_user': 'root',
    'ssh_pass': 'cG730t*%?2fM',
    'ssh_port': 22,
    'mode': 'install',
    'mappings': [
        {'domain': 'quicklendings.com', 'ip': '192.119.169.5'},
        {'domain': 'tommorrow-loan.com', 'ip': '192.119.169.123'},
        {'domain': 'tommorrow-loan.com', 'ip': '192.119.169.124'}
    ]
}

r = client.post('/install', json=install_data, headers=headers)
print('Install API Response:', r.status_code, r.get_json())
print("Waiting 120 seconds for background thread to finish...")
time.sleep(120)
