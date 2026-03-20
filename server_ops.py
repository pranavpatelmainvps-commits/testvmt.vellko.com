import paramiko
import os
import sys

IP = "162.19.228.208"
USER = "almalinux"
KEY_FILE = "vlkey.pem"
LOG_FILE = "server_discovery.log"

def run_ssh():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    with open(LOG_FILE, "w", encoding="utf-8") as log:
        try:
            log.write(f"Connecting to {IP}...\n")
            key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
            client.connect(IP, username=USER, pkey=key, timeout=15)
            
            cmds = [
                "echo '--- FILES IN /opt/pmta-dashboard ---' && ls -la /opt/pmta-dashboard",
                "echo '--- SEARCHING FOR WARMING ---' && sudo find /opt /etc -iname '*warm*' 2>/dev/null",
                "echo '--- DATABASE CHECK ---' && ls -la /opt/pmta-dashboard/*.db",
            ]
            
            for cmd in cmds:
                log.write(f"\nRunning: {cmd}\n")
                stdin, stdout, stderr = client.exec_command(cmd)
                out = stdout.read().decode()
                err = stderr.read().decode()
                log.write(out)
                if err:
                    log.write(f"STDERR: {err}\n")

            # Create Backup
            log.write("\nCreating backup of code and db...\n")
            backup_cmd = "sudo tar -czf /home/almalinux/dashboard_code_db_backup.tar.gz /opt/pmta-dashboard /etc/pmta"
            stdin, stdout, stderr = client.exec_command(backup_cmd)
            stdout.channel.recv_exit_status()
            log.write("Backup command finished.\n")

        except Exception as e:
            log.write(f"Exception: {e}\n")
        finally:
            client.close()
    print(f"Discovery complete. Results in {LOG_FILE}")

if __name__ == "__main__":
    run_ssh()
