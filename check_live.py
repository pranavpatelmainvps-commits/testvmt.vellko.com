import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
key = paramiko.RSAKey.from_private_key_file(r'C:\Users\Pranav\Downloads\VLkeyUS (1).pem')
client.connect('162.19.228.208', username='almalinux', pkey=key, timeout=10)

commands = [
    "cd /opt/pmta-dashboard && git status",
    "cd /opt/pmta-dashboard && git log -n 3 --oneline",
    "cd /opt/pmta-dashboard && grep -i 'is_verified' backend.py",
    "cd /opt/pmta-dashboard && grep -i 'test-ssh' backend.py"
]

for cmd in commands:
    print(f"=== {cmd} ===")
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print("ERRORS:", err)

client.close()
