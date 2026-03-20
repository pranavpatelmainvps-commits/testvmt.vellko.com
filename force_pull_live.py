import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(r'C:\Users\Pranav\Downloads\VLkeyUS (1).pem')

print("Connecting to live server...")
client.connect('162.19.228.208', username='almalinux', pkey=key, timeout=10)

print("Running git fetch and hard reset...")
stdin, stdout, stderr = client.exec_command('cd /opt/pmta-dashboard && git fetch origin && git reset --hard origin/main')
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())

print("Restarting docker compose...")
stdin, stdout, stderr = client.exec_command('cd /opt/pmta-dashboard && docker compose -f docker-compose.dashboard.yml build --no-cache && docker compose -f docker-compose.dashboard.yml up -d')
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())

client.close()
print("Done!")
