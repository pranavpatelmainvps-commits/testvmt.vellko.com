import paramiko
import sys
import socket

IP = "212.107.15.197"
USER = "root"
PASS = "wzf2V3U5X5dWx4Se2H"

print(f"Testing connectivity to {IP}...")

# 1. TCP Connect
try:
    sock = socket.create_connection((IP, 22), timeout=5)
    print("TCP Port 22: OPEN")
    sock.close()
except Exception as e:
    print(f"TCP Port 22: CLOSED/ERROR ({e})")
    sys.exit(1)

# 2. SSH Login
print("Attempting SSH Login...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(IP, username=USER, password=PASS, timeout=10)
    print("SSH Authentication: SUCCESS")
    
    stdin, stdout, stderr = client.exec_command("whoami")
    print(f"Remote User: {stdout.read().decode().strip()}")
    
    client.close()
except paramiko.AuthenticationException:
    print("SSH Authentication: FAILED (Wrong Credentials?)")
except Exception as e:
    print(f"SSH Error: {e}")
