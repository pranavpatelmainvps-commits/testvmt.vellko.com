import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(r'C:\Users\Pranav\Downloads\VLkeyUS (1).pem')

print("Connecting to live server...")
client.connect('162.19.228.208', username='almalinux', pkey=key, timeout=10)

print("Fetching docker logs...")
stdin, stdout, stderr = client.exec_command('cd /opt/pmta-dashboard && docker compose -f docker-compose.dashboard.yml logs pmta-dashboard --tail 50')
print("STDOUT:")
print(stdout.read().decode())
print("STDERR:")
print(stderr.read().decode())

client.close()
