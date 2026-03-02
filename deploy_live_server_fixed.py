import paramiko
import sys
IP = "162.19.228.208"
USER = "almalinux"
KEY_FILE = r"C:\Users\Pranav\Downloads\VLkeyUS (1).pem"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
    client.connect(IP, username=USER, pkey=key, timeout=10)
    
    print("Connected. Pulling repo as almalinux...")
    stdin, stdout, stderr = client.exec_command("cd /opt/pmta-dashboard && git pull origin main")
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print(f"Git ERR: {err}")
    
    print("Building docker (pmta-dashboard)...")
    stdin, stdout, stderr = client.exec_command("cd /opt/pmta-dashboard && sudo docker compose build --no-cache pmta-dashboard && sudo docker compose up -d pmta-dashboard")
    
    for line in stdout:
        try:
            sys.stdout.write(line)
        except Exception:
            sys.stdout.write(line.encode('ascii', 'ignore').decode('ascii'))
            
    err = stderr.read().decode(errors='ignore')
    if err:
        print(f"Docker ERR: {err}")
        
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
