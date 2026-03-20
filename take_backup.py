import paramiko

IP = "162.19.228.208"
USER = "almalinux"
KEY_FILE = r"C:\Users\Pranav\Downloads\VLkeyUS (1).pem"

print("Connecting to live server to take a backup...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
    client.connect(IP, username=USER, pkey=key, timeout=10)
    
    backup_cmd = "sudo cp -r /opt/pmta-dashboard /opt/pmta-dashboard-backup-$(date +%F-%H%M-%S)"
    print(f"Executing: {backup_cmd}")
    stdin, stdout, stderr = client.exec_command(backup_cmd)
    
    # Wait for completion
    exit_status = stdout.channel.recv_exit_status()
    err = stderr.read().decode()
    if err:
        print(f"Error: {err}")
    elif exit_status == 0:
        print("Backup created successfully!")
    else:
        print(f"Backup failed with status code {exit_status}")
        
except Exception as e:
    print(f"Script Error: {e}")
finally:
    client.close()
