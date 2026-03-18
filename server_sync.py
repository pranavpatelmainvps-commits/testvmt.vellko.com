import paramiko
import os

IP = "162.19.228.208"
USER = "almalinux"
KEY_FILE = "vlkey.pem"

FILES_TO_SYNC = [
    ("backend.py", "/opt/pmta-dashboard/backend.py"),
    ("pdns_automator.py", "/opt/pmta-dashboard/pdns_automator.py")
]

# Where these files live INSIDE the Docker container
CONTAINER_APP_DIR = "/app"

def sync_files():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {IP}...")
        key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
        client.connect(IP, username=USER, pkey=key, timeout=15)
        
        sftp = client.open_sftp()
        
        # Step 1: Upload files to host /opt/pmta-dashboard/
        for local_f, remote_f in FILES_TO_SYNC:
            print(f"Uploading {local_f} to host {remote_f}...")
            tmp_remote = f"/tmp/{os.path.basename(local_f)}"
            sftp.put(local_f, tmp_remote)
            move_cmd = f"sudo mv {tmp_remote} {remote_f} && sudo chown almalinux:almalinux {remote_f}"
            stdin, stdout, stderr = client.exec_command(move_cmd)
            stdout.channel.recv_exit_status()
            print(f"  Host sync OK: {remote_f}")
        
        sftp.close()
        
        # Step 2: Find the running dashboard container
        stdin, stdout, stderr = client.exec_command("sudo docker ps --format '{{.Names}}' | grep -i dashboard | grep -v mariadb | head -1")
        container_name = stdout.read().decode().strip()
        print(f"\nRunning container: {container_name}")
        
        if container_name:
            # Step 3: docker cp files directly INTO the running container
            for local_f, remote_f in FILES_TO_SYNC:
                container_path = f"{CONTAINER_APP_DIR}/{os.path.basename(local_f)}"
                cp_cmd = f"sudo docker cp {remote_f} {container_name}:{container_path}"
                print(f"  docker cp -> {container_name}:{container_path}")
                stdin, stdout, stderr = client.exec_command(cp_cmd)
                stdout.channel.recv_exit_status()
                err = stderr.read().decode().strip()
                if err:
                    print(f"  [WARN] {err}")
            
            # Step 4: Restart the container to reload Flask
            print(f"\nRestarting container {container_name}...")
            stdin, stdout, stderr = client.exec_command(f"sudo docker restart {container_name}")
            stdout.channel.recv_exit_status()
            print("Done.\n")
        else:
            print("[WARN] No dashboard container found. Files updated on host only.")
        
    except Exception as e:
        print(f"Exception: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    sync_files()

