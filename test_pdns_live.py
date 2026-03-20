import paramiko

DASH_IP = "162.19.228.208"
DASH_USER = "almalinux"
KEY_FILE = "vlkey.pem"
LOG_FILE = "pdns_e2e_test.log"

def run():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    with open(LOG_FILE, "w", encoding="utf-8") as log:
        try:
            key = paramiko.RSAKey.from_private_key_file(KEY_FILE)
            client.connect(DASH_IP, username=DASH_USER, pkey=key, timeout=15)
            log.write("Connected to dashboard server.\n\n")
            
            cmds = [
                # 1. Test PDNS API from dashboard server
                ("curl -s -w '\\nHTTP_CODE:%{http_code}' -H 'X-API-Key: MyDNSApiKey2026' http://192.119.169.12:8081/api/v1/servers/localhost 2>&1", "Test PDNS API from dashboard"),
                
                # 2. List zones
                ("curl -s -H 'X-API-Key: MyDNSApiKey2026' http://192.119.169.12:8081/api/v1/servers/localhost/zones 2>&1", "List zones from dashboard"),
                
                # 3. Test from inside the container
                ("CONTAINER=$(sudo docker ps --format '{{.Names}}' | grep 'pmta-dashboard-pmta-dashboard' | head -1) && echo \"Container: $CONTAINER\" && sudo docker exec $CONTAINER python3 -c \"import requests; r = requests.get('http://192.119.169.12:8081/api/v1/servers/localhost/zones', headers={'X-API-Key': 'MyDNSApiKey2026'}); print(f'Status: {r.status_code}'); print(r.text[:500])\" 2>&1", "Test from container"),
                
                # 4. Check PDNS env vars in the restarted container
                ("CONTAINER=$(sudo docker ps --format '{{.Names}}' | grep 'pmta-dashboard-pmta-dashboard' | head -1) && sudo docker exec $CONTAINER env | grep -i pdns 2>&1", "Container PDNS env vars"),
            ]
            
            for cmd, desc in cmds:
                log.write(f"--- {desc} ---\n")
                log.write(f"CMD: {cmd}\n")
                stdin, stdout, stderr = client.exec_command(cmd, timeout=15)
                out = stdout.read().decode()
                err = stderr.read().decode()
                log.write(f"OUT: {out}\n")
                if err:
                    log.write(f"ERR: {err}\n")
                log.write("\n")

        except Exception as e:
            log.write(f"Exception: {e}\n")
        finally:
            client.close()
    print(f"Done. Results in {LOG_FILE}")

if __name__ == "__main__":
    run()
