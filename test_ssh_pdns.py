import sys
sys.path.insert(0, '/app')
from backend import get_ssh_connection

try:
    ssh = get_ssh_connection('192.119.169.5', 'root', 'cG730t*%?2fM')
    stdin, stdout, stderr = ssh.exec_command('cat /etc/pdns/pdns.conf | grep api-key || echo "Not found"')
    print("PDNS 192.119.169.5:", stdout.read().decode().strip())
    ssh.close()
except Exception as e:
    print("Error:", e)
