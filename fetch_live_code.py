import paramiko

IP = "162.19.228.208"
USER = "almalinux"
KEY_FILE = r"C:\Users\Pranav\Downloads\VLkeyUS (1).pem"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
    client.connect(IP, username=USER, pkey=key, timeout=10)
    
    # Check if ForgotPassword.tsx exists
    stdin, stdout, stderr = client.exec_command("find /opt/pmta-dashboard -name '*Forgot*'")
    print(f"Results for '*Forgot*':\n{stdout.read().decode().strip()}")
    
    # Check App.tsx content
    stdin, stdout, stderr = client.exec_command("cat /opt/pmta-dashboard/temp_dashboard_extract_v2/app/src/App.tsx")
    print(f"\nApp.tsx:\n{stdout.read().decode().strip()}")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
