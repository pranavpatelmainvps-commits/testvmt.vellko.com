import paramiko
import os

IP = "162.19.228.208"
USER = "almalinux"
KEY_FILE = "vlkey.pem"
STATIC_DIR = "static"
REMOTE_STATIC = "/opt/pmta-dashboard/static"

def sync_frontend():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {IP}...")
        key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
        client.connect(IP, username=USER, pkey=key, timeout=15)
        
        sftp = client.open_sftp()
        
        print("Cleaning up remote static directory...")
        client.exec_command(f"sudo rm -rf {REMOTE_STATIC}/*")
        
        # Upload all files in static
        for root, dirs, files in os.walk(STATIC_DIR):
            for file in files:
                local_path = os.path.join(root, file)
                rel_path = os.path.relpath(local_path, STATIC_DIR)
                remote_path = f"{REMOTE_STATIC}/{rel_path}".replace("\\", "/")
                
                # Make sure remote dir exists
                remote_dir = os.path.dirname(remote_path)
                client.exec_command(f"sudo mkdir -p {remote_dir} && sudo chown almalinux:almalinux {remote_dir}")
                
                print(f"Uploading {local_path} -> {remote_path}")
                tmp_remote = f"/tmp/{file}"
                sftp.put(local_path, tmp_remote)
                
                move_cmd = f"sudo mv {tmp_remote} {remote_path} && sudo chown almalinux:almalinux {remote_path}"
                stdin, stdout, stderr = client.exec_command(move_cmd)
                stdout.channel.recv_exit_status()
                
        sftp.close()
        
        print("Restarting pmta-dashboard container...")
        restart_cmd = "cd /opt/pmta-dashboard && sudo docker-compose restart pmta-dashboard"
        stdin, stdout, stderr = client.exec_command(restart_cmd)
        stdout.channel.recv_exit_status()
        print("Done.")

    except Exception as e:
        print(f"Exception: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    sync_frontend()
