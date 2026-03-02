import paramiko

IP = "162.19.228.208"
USER = "almalinux"
KEY_FILE = r"C:\Users\Pranav\Downloads\VLkeyUS (1).pem"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
    client.connect(IP, username=USER, pkey=key, timeout=10)
    
    # Check for "forgot password" case insensitively
    stdin, stdout, stderr = client.exec_command("grep -ril 'forgot password' /opt/pmta-dashboard/")
    print(f"\nFiles containing 'forgot password':\n{stdout.read().decode().strip()}")
    
    # See if there's any other directory being served
    stdin, stdout, stderr = client.exec_command("docker ps")
    print(f"\nDocker PS:\n{stdout.read().decode().strip()}")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
