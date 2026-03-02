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
    
    print("Fetching Docker logs...")
    # Get logs from the pmta-dashboard container
    stdin, stdout, stderr = client.exec_command("cd /opt/pmta-dashboard && sudo docker compose logs --tail 50 pmta-dashboard")
    
    for line in stdout:
        sys.stdout.write(line)
        
    err = stderr.read().decode()
    if err:
        print(f"Docker ERR: {err}")
        
    # Also check if the container is running
    print("\n--- Container Status ---")
    stdin, stdout, stderr = client.exec_command("cd /opt/pmta-dashboard && sudo docker compose ps")
    for line in stdout:
        sys.stdout.write(line)
    
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
