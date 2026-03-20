import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(r'C:\Users\Pranav\Downloads\VLkeyUS (1).pem')

print("Connecting to live server...")
client.connect('162.19.228.208', username='almalinux', pkey=key, timeout=10)

stdin, stdout, stderr = client.exec_command('cd /opt/pmta-dashboard && docker compose -f docker-compose.dashboard.yml logs pmta-dashboard --tail 50')
logs = stdout.read().decode() + "\n" + stderr.read().decode()
with open("remote_crash_logs.txt", "w") as f:
    f.write(logs)

client.close()
