import paramiko
import os

IP = "162.19.228.208"
USER = "almalinux"
KEY_FILE = r"C:\Users\Pranav\Downloads\VLkeyUS (1).pem"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
    client.connect(IP, username=USER, pkey=key, timeout=10)
    
    # Get backend.py
    stdin, stdout, stderr = client.exec_command("cat /opt/pmta-dashboard/backend.py")
    with open("live_backend.py", "w", encoding="utf-8") as f:
        f.write(stdout.read().decode())
    
    # Get templates
    stdin, stdout, stderr = client.exec_command("ls /opt/pmta-dashboard/templates")
    templates = [t.strip() for t in stdout.read().decode().strip().split('\n') if t.strip()]
    
    os.makedirs("live_templates", exist_ok=True)
    for tmpl in templates:
        stdin, stdout, stderr = client.exec_command(f"cat /opt/pmta-dashboard/templates/{tmpl}")
        with open(f"live_templates/{tmpl}", "w", encoding="utf-8") as f:
            f.write(stdout.read().decode())
            
    print(f"Successfully downloaded backend.py and templates: {templates}")

except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
