import paramiko

IP = "162.19.228.208"
USER = "almalinux"
KEY_FILE = r"C:\Users\Pranav\Downloads\VLkeyUS (1).pem"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
    client.connect(IP, username=USER, pkey=key, timeout=10)
    
    # Check for "forgot password" or "reset" in backend.py
    stdin, stdout, stderr = client.exec_command("grep -n -E -i 'forgot|reset' /opt/pmta-dashboard/backend.py")
    print(f"\nBackend.py Matches:\n{stdout.read().decode().strip()}")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
