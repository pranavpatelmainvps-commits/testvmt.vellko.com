import paramiko
import sys

IP = "162.19.228.208"
USER = "almalinux"
KEY_FILE = r"C:\Users\Pranav\Downloads\VLkeyUS (1).pem"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"Connecting to {IP} as {USER}...")
    key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
    client.connect(IP, username=USER, pkey=key, timeout=10)
    
    print("Connection successful! Running checks...")
    
    # 1. Whoami
    stdin, stdout, stderr = client.exec_command("whoami")
    print(f"User: {stdout.read().decode().strip()}")
    
    # 2. Check directory
    stdin, stdout, stderr = client.exec_command("ls -la /opt/pmta-dashboard | head -n 10")
    print(f"Directory Contents:\n{stdout.read().decode().strip()}")
    
    # 3. Git status
    stdin, stdout, stderr = client.exec_command("cd /opt/pmta-dashboard && git status")
    git_status = stdout.read().decode().strip()
    git_err = stderr.read().decode().strip()
    print(f"\nGit Status:\n{git_status}\n{git_err}")
    
    # 4. Git remote
    stdin, stdout, stderr = client.exec_command("cd /opt/pmta-dashboard && git remote -v")
    print(f"\nGit Remote:\n{stdout.read().decode().strip()}")

except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
