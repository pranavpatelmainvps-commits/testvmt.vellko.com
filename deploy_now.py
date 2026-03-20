import paramiko, sys
IP = "162.19.228.208"
USER = "almalinux"
KEY_FILE = r"C:\Users\Pranav\Downloads\VLkeyUS (1).pem"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
    client.connect(IP, username=USER, pkey=key, timeout=10)
    
    print("1. Stashing local changes...")
    stdin, stdout, stderr = client.exec_command("cd /opt/pmta-dashboard && git stash")
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    print("2. Pulling latest code...")
    stdin, stdout, stderr = client.exec_command("cd /opt/pmta-dashboard && git pull origin main")
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    print("3. Rebuilding Docker...")
    stdin, stdout, stderr = client.exec_command("cd /opt/pmta-dashboard && sudo docker compose build && sudo docker compose up -d")
    for line in stdout:
        sys.stdout.write(line)
    err = stderr.read().decode()
    if err:
        print(f"Docker output: {err}")
    
    print("\nDone!")
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
