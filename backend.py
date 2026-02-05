from flask import Flask, request, jsonify, send_from_directory
import paramiko
import tempfile
import os
import threading
import time
import subprocess
import sys
import requests
import socket
import string
import secrets
from datetime import datetime

# Constants
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Mail Server Credentials (Fixed infrastructure)
MAIL_SERVER_IP = "212.107.15.197"
MAIL_SERVER_USER = "root"
MAIL_SERVER_PASS = "wzf2V3U5X5dWx4Se2H" 

# PMTA Files to Upload
PMTA_FILES = [
    "PowerMTA-5.0r6.rpm",
    "license"
]

# Use local path for easier debugging
# Hardcode absolute path to ensure we are writing to the expected file
# Use relative path suitable for Docker container (mapped volume)
INSTALL_LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "install_progress.log")

app = Flask(__name__)

RECEIVED_EMAILS = []

@app.route("/api/inbound/webhook", methods=["POST"])
def inbound_webhook():
    data = request.json
    print(f"Received Inbound Mail Webhook: {data.get('subject')} from {data.get('sender')}")
    RECEIVED_EMAILS.append(data)
    # Keep only last 100 emails in memory
    if len(RECEIVED_EMAILS) > 100:
        RECEIVED_EMAILS.pop(0)
        
    return jsonify({"status": "received", "count": len(RECEIVED_EMAILS)})

@app.route("/api/inbound/emails", methods=["GET"])
def get_inbound_emails():
    return jsonify({"emails": list(reversed(RECEIVED_EMAILS))})

PMTA_TEMPLATE = "pmta-advanced.sh.tmpl"
BASE_INSTALLER = "pmta-install.sh.tmpl"
PMTA_INSTALL_SCRIPT = "pmta-install.sh.tmpl"
PLATFORM_SMTP_HOSTNAME = "smtp.quicklendings.com"

# Files expected in the current directory
PMTA_FILES = ["PowerMTA.rpm", "pmtad", "pmtahttpd", "license"]

@app.route("/api/config/fetch", methods=["POST"])
def fetch_config():
    data = request.json
    server_ip = data.get("server_ip")
    ssh_user = data.get("ssh_user")
    ssh_pass = data.get("ssh_pass")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(server_ip, username=ssh_user, password=ssh_pass, timeout=10)
        stdin, stdout, stderr = ssh.exec_command("cat /etc/pmta/config")
        config_content = stdout.read().decode('utf-8')
        ssh.close()
        return jsonify({"status": "success", "config": config_content})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route("/api/config/save", methods=["POST"])
def save_config():
    data = request.json
    server_ip = data.get("server_ip")
    ssh_user = data.get("ssh_user")
    ssh_pass = data.get("ssh_pass")
    new_config = data.get("config")
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(server_ip, username=ssh_user, password=ssh_pass, timeout=10)
        
        # Write to temp file then move
        # Using echo or cat with heredoc can be tricky with large files/special chars.
        # Safer to use SFTP
        sftp = ssh.open_sftp()
        with sftp.file("/tmp/new_pmta_config", "w") as f:
            f.write(new_config)
        sftp.close()
        
        # Move and Restart
        stdin, stdout, stderr = ssh.exec_command("mv /tmp/new_pmta_config /etc/pmta/config && systemctl restart pmta")
        exit_code = stdout.channel.recv_exit_status()
        
        ssh.close()
        
        if exit_code == 0:
            return jsonify({"status": "success", "message": "Configuration saved and PMTA restarted"})
        else:
            err = stderr.read().decode('utf-8')
            return jsonify({"status": "error", "message": f"Failed to apply config: {err}"})
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory("static", path)

@app.route("/install", methods=["POST"])
def install_pmta():
    data = request.json
    print(f">>> DEBUG: /install called. Data keys: {list(data.keys()) if data else 'None'}", flush=True)
    # Save status immediately so UI updates instantly upon reload
    # [FIX] Save credentials ensuring they are available for other endpoints
    initial_status = {
        "status": "installing", 
        "message": "Installation started...",
        "server_ip": data.get("server_ip"),
        "ssh_user": data.get("ssh_user"),
        "ssh_pass": data.get("ssh_pass"),
        # Preserve mode and other useful info
        "mode": data.get("mode", "install")
    }
    save_install_status(initial_status)
    threading.Thread(target=run_install, args=(data,)).start()
    return jsonify({"status": "started", "message": "Installation started"})

INSTALL_STATUS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "install_status.json")

@app.route("/api/status", methods=["GET"])
def get_system_status():
    if os.path.exists(INSTALL_STATUS_FILE):
        try:
            import json
            with open(INSTALL_STATUS_FILE, "r") as f:
                return jsonify(json.load(f))
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify({"status": "not_installed"})

def save_install_status(data):
    try:
        import json
        current_data = {}
        if os.path.exists(INSTALL_STATUS_FILE):
            try:
                with open(INSTALL_STATUS_FILE, "r") as f:
                    current_data = json.load(f)
            except:
                pass
        
        # Merge
        current_data.update(data)
        
        with open(INSTALL_STATUS_FILE, "w") as f:
            json.dump(current_data, f, indent=2)
    except Exception as e:
        print(f"Failed to save install status: {e}")

def get_install_credentials():
    if os.path.exists(INSTALL_STATUS_FILE):
        try:
            import json
            with open(INSTALL_STATUS_FILE, "r") as f:
                data = json.load(f)
                return data.get("server_ip"), data.get("ssh_user"), data.get("ssh_pass")
        except:
            pass
    return None, None, None

def parse_pmta_config(config_str):
    """Parses PMTA config string into structured JSON"""
    import re
    
    parsed = {
        "global": {
            "runAsUser": "pmta", "runAsGroup": "pmta", "logFile": "/var/log/pmta/log",
            "httpPort": 8080, "httpAdminPort": 8081, "smtpPort": 25,
            "maxConnections": 100, "maxMessagesPerConnection": 1000, 
            "maxMessagesPerHour": 10000, "hostname": "localhost"
        },
        "vmtas": [],
        "pools": [],
        "sources": [],
        "users": [],
        "domains": [], # We are ignoring domains for now mostly
        "bounceRules": [],
        "patternLists": []
    }

    # Helper to extract key values
    def get_val(block, key, default=None):
        m = re.search(f"{key}\s+(.+)", block)
        return m.group(1).strip() if m else default

    # 1. Parse VMTAs
    for m in re.finditer(r'<virtual-mta\s+([^>]+)>(.*?)</virtual-mta>', config_str, re.DOTALL):
        name = m.group(1).strip()
        content = m.group(2)
        parsed["vmtas"].append({
            "id": f"vmta-{name}",
            "name": name,
            "smtpSourceHost": get_val(content, "smtp-source-host") or "",
            "dkimEnabled": "domain-key" in content,
            "enabled": True # default
        })

    # 2. Parse Pools
    for m in re.finditer(r'<virtual-mta-pool\s+([^>]+)>(.*?)</virtual-mta-pool>', config_str, re.DOTALL):
        name = m.group(1).strip()
        content = m.group(2)
        members = re.findall(r'virtual-mta\s+([^\s]+)', content)
        parsed["pools"].append({
            "id": f"pool-{name}",
            "name": name,
            "vmtas": [f"vmta-{x}" for x in members],
            "enabled": True
        })
        
    # 3. Parse Sources
    for m in re.finditer(r'<source\s+([^>]+)>(.*?)</source>', config_str, re.DOTALL):
        name = m.group(1).strip()
        content = m.group(2)
        parsed["sources"].append({
            "id": f"source-{name}",
            "name": name,
            "alwaysAllowRelaying": "always-allow-relaying yes" in content,
            "smtpService": "smtp-service yes" in content,
            "addDateHeader": "add-date-header yes" in content,
            "requireAuth": "require-auth" in content, # Simple check
            "defaultVMTA": get_val(content, "default-virtual-mta"),
            "enabled": True
        })

    # 4. Parse Users
    for m in re.finditer(r'<smtp-user\s+([^>]+)>(.*?)</smtp-user>', config_str, re.DOTALL):
        name = m.group(1).strip()
        content = m.group(2)
        parsed["users"].append({
            "id": f"user-{name}",
            "username": name,
            "password": get_val(content, "password") or "",
            "source": get_val(content, "source"),
            "enabled": True
        })

    return parsed

# --- NEW API ENDPOINTS FOR PMTA CONFIG ---

@app.route("/api/pmta/config", methods=["GET"])
def get_pmta_config_api():
    server_ip, ssh_user, ssh_pass = get_install_credentials()
    if not server_ip:
        return jsonify({"error": "System not installed"}), 400

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(server_ip, username=ssh_user, password=ssh_pass, timeout=10)
        stdin, stdout, stderr = ssh.exec_command("cat /etc/pmta/config")
        config_content = stdout.read().decode('utf-8')
        ssh.close()
        
        parsed_config = parse_pmta_config(config_content)
        return jsonify(parsed_config)
    except Exception as e:
        print(f"!!! Error in get_pmta_config_api: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/pmta/config/update_credentials", methods=["POST"])
def update_credentials():
    data = request.json
    server_ip = data.get("server_ip")
    ssh_user = data.get("ssh_user")
    ssh_pass = data.get("ssh_pass")

    if not all([server_ip, ssh_user, ssh_pass]):
        return jsonify({"status": "error", "message": "Missing credentials"}), 400

    save_install_status({
        "server_ip": server_ip,
        "ssh_user": ssh_user,
        "ssh_pass": ssh_pass
    })
    
    return jsonify({"status": "success", "message": "Credentials updated"})

def build_pmta_config(config_json):
    """Builds PMTA config string from JSON"""
    lines = []
    
    # 1. Global Settings
    g = config_json.get("global", {})
    lines.append("# Global Settings")
    if g.get("runAsUser"): lines.append(f"run-as-user {g['runAsUser']}")
    if g.get("runAsGroup"): lines.append(f"run-as-group {g['runAsGroup']}")
    if g.get("logFile"): lines.append(f"log-file {g['logFile']}")
    if g.get("httpPort"): lines.append(f"http-mgmt-port {g['httpPort']}")
    if g.get("httpAdminPort"): lines.append(f"http-access {g.get('hostname', '*') or '*'} admin {g['httpAdminPort']}")
    if g.get("smtpPort"): lines.append(f"smtp-port {g['smtpPort']}")
    if g.get("maxConnections"): lines.append(f"max-smtp-out {g['maxConnections']}")
    if g.get("maxMessagesPerConnection"): lines.append(f"max-msg-per-connection {g['maxMessagesPerConnection']}")
    if g.get("maxMessagesPerHour"): lines.append(f"max-msg-rate {g['maxMessagesPerHour']}/hour")
    if g.get("addDateHeader"): lines.append("add-date-header yes")
    if g.get("addMessageIdHeader"): lines.append("add-message-id-header yes")
    if g.get("retryAfter"): lines.append(f"retry-after {g['retryAfter']}")
    if g.get("bounceAfter"): lines.append(f"bounce-after {g['bounceAfter']}")
    
    # Enable accounting
    lines.append("acct-file /var/log/pmta/acct.csv")
    lines.append("")

    # 2. VMTAs
    lines.append("# Virtual MTAs")
    for vmta in config_json.get("vmtas", []):
        if not vmta.get("enabled", True): continue
        lines.append(f"<virtual-mta {vmta['name']}>")
        lines.append(f"    smtp-source-host {vmta['smtpSourceHost']}")
        if vmta.get("dkimEnabled") and vmta.get("domainKey"):
            dk = vmta["domainKey"]
            lines.append(f"    domain-key {dk['selector']},{dk['domain']},{dk['keyPath']}")
        if vmta.get("maxConnections"):
            lines.append(f"    max-smtp-out {vmta['maxConnections']}")
        lines.append("</virtual-mta>")
        lines.append("")

    # 3. Pools
    lines.append("# VMTA Pools")
    for pool in config_json.get("pools", []):
        if not pool.get("enabled", True): continue
        lines.append(f"<virtual-mta-pool {pool['name']}>")
        for member in pool.get("vmtas", []):
            # member is ID (e.g. vmta-123), need name? 
            # The frontend passes IDs in vmtas list, but usually name is preferred.
            # Wait, the structure in parse_pmta_config creates IDs as "vmta-{name}".
            # In useVMTAManager, addVMTA creates id "vmta-{timestamp}".
            # This ID mismatch is tricky. 
            # Ideally the frontend should resolve IDs to names before sending or we handle it here.
            # But wait, looking at parse_pmta_config:
            # parsed["vmtas"].append({ "id": f"vmta-{name}", "name": name ... })
            # If the user added a NEW VMTA, ID is "vmta-timestamp", Name is what they typed.
            # The pool stores IDs.
            # We need to lookup the name from the ID.
            
            # Helper to find VMTA name by ID
            vmta_ref = next((v for v in config_json.get("vmtas", []) if v["id"] == member), None)
            if vmta_ref:
                lines.append(f"    virtual-mta {vmta_ref['name']}")
            # Fallback if it's already a name or not found
            else:
                 # If the ID looks like "vmta-NAME", extract NAME? 
                 # Or just use the ID if it matches a name?
                 # Let's assume for now the frontend might need to ensure consistency or we just output the ID if name not found
                 # But valid config needs valid VMTA names.
                 # If existing, ID=vmta-name.
                 if member.startswith("vmta-"):
                     lines.append(f"    virtual-mta {member[5:]}")
                 else:
                     lines.append(f"    virtual-mta {member}")

        lines.append("</virtual-mta-pool>")
        lines.append("")

    # 4. Sources
    lines.append("# Sources")
    for source in config_json.get("sources", []):
        if not source.get("enabled", True): continue
        lines.append(f"<source {source['name']}>")
        if source.get("alwaysAllowRelaying"): lines.append("    always-allow-relaying yes")
        if source.get("smtpService"): lines.append("    smtp-service yes")
        if source.get("requireAuth"): lines.append("    require-auth true")
        if source.get("addDateHeader"): lines.append("    add-date-header yes")
        if source.get("defaultVMTA"): 
            # Same ID resolution potentially needed for defaultVMTA
            lines.append(f"    default-virtual-mta {source['defaultVMTA']}")
        if source.get("maxConnections"):
            lines.append(f"    max-connect-rate {source['maxConnections']}/min") # specific rate limit
        lines.append("</source>")
        lines.append("")

    # 5. Users
    lines.append("# SMTP Users")
    for user in config_json.get("users", []):
        if not user.get("enabled", True): continue
        lines.append(f"<smtp-user {user['username']}>")
        if user.get("password"): lines.append(f"    password {user['password']}")
        if user.get("source"): lines.append(f"    source {user['source']}")
        if user.get("maxMessagesPerHour"): lines.append(f"    max-msg-rate {user['maxMessagesPerHour']}/hour")
        lines.append("</smtp-user>")
        lines.append("")

    # 6. Bounce Rules
    if config_json.get("bounceRules"):
        lines.append("# Bounce Rules")
        lines.append("<bounce-category-patterns>")
        for rule in config_json.get("bounceRules", []):
            if not rule.get("enabled", True): continue
            # Format: /pattern/  category
            # PMTA categories: hard-bounce, soft-bounce, success, ignore...
            # The UI has: type: hard/soft/defer, action: bounce/retry...
            # Mapping UI to PMTA categories might be approximate.
            cat = "soft-bounce"
            if rule.get("type") == "hard": cat = "hard-bounce"
            elif rule.get("type") == "defer": cat = "transient-failure" # or similar
            
            lines.append(f"    /{rule['pattern']}/    {cat}")
        lines.append("</bounce-category-patterns>")
        lines.append("")

    return "\n".join(lines)

@app.route("/api/pmta/config", methods=["POST"])
def save_pmta_config_api():
    server_ip, ssh_user, ssh_pass = get_install_credentials()
    if not server_ip:
        return jsonify({"error": "System not installed"}), 400

    config_json = request.json
    try:
        new_config_str = build_pmta_config(config_json)
        
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(server_ip, username=ssh_user, password=ssh_pass, timeout=10)
        
        # Write to temp
        sftp = ssh.open_sftp()
        with sftp.file("/tmp/pmta_config_new", "w") as f:
            f.write(new_config_str)
        sftp.close()
        
        # Backup and Move
        stdin, stdout, stderr = ssh.exec_command("cp /etc/pmta/config /etc/pmta/config.bak && mv /tmp/pmta_config_new /etc/pmta/config")
        error = stderr.read().decode('utf-8')
        ssh.close()
        
        if error:
            return jsonify({"status": "error", "message": f"File op error: {error}"}), 500
            
        return jsonify({"status": "success", "message": "Configuration saved"})
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/pmta/config/apply", methods=["POST"])
def apply_pmta_config_api():
    server_ip, ssh_user, ssh_pass = get_install_credentials()
    if not server_ip:
        return jsonify({"error": "System not installed"}), 400
        
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(server_ip, username=ssh_user, password=ssh_pass, timeout=10)
        
        # Reload/Restart PMTA
        # Try full path first, then plain command
        cmd = "if [ -f /usr/sbin/pmta ]; then /usr/sbin/pmta reload; else pmta reload; fi"
        
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        exit_code = stdout.channel.recv_exit_status()
        
        ssh.close()
        
        if exit_code != 0:
             return jsonify({
                 "status": "error", 
                 "message": f"Reload failed (Exit {exit_code}): {err} {out}"
             }), 500
            
        return jsonify({
            "status": "success", 
            "message": f"PMTA reloaded successfully. {out}"
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/pmta/config/validate", methods=["POST"])
def validate_pmta_config_api():
    # Mock validation for now
    return jsonify({"valid": True, "errors": []})

@app.route("/api/dns/info", methods=["POST"])
def get_dns_info_api():
    server_ip, ssh_user, ssh_pass = get_install_credentials()
    if not server_ip:
        return jsonify({"error": "System not installed"}), 400
    
    data = request.json
    domain = data.get("domain")
    if not domain:
        return jsonify({"error": "Domain is required"}), 400

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    dkim_record = ""
    try:
        ssh.connect(server_ip, username=ssh_user, password=ssh_pass, timeout=10)
        
        # Try to read DKIM key
        # Standard path in our setup: /etc/pmta/domainKeys/domain.com/default.pub or similar
        # Based on previous discussions, likely /etc/pmta/domainKeys/<domain>/default.pub 
        # or /etc/pmta/domainKeys/<domain>.pub
        # Let's try finding it.
        
        # Check specific path logic from previous conversations or assumptions
        # We'll try a few common locations
        cmd = f"cat /etc/pmta/domainKeys/{domain}/default.pub 2>/dev/null || cat /etc/pmta/domainKeys/{domain}.pub 2>/dev/null"
        stdin, stdout, stderr = ssh.exec_command(cmd)
        dkim_content = stdout.read().decode('utf-8').strip()
        
        if dkim_content:
             # Extract valid key part if it has comments
             dkim_record = dkim_content
        else:
             dkim_record = "DKIM key not found on server. Please ensure the domain is configured in PMTA."
             
        ssh.close()
    except Exception as e:
        dkim_record = f"Error fetching DKIM: {str(e)}"

    # Generate records
    spf_record = f"v=spf1 ip4:{server_ip} ~all"
    dmarc_record = f"v=DMARC1; p=none; rua=mailto:dmarc@{domain}"
    
    # NS Records (assuming local PowerDNS or simply pointing to this server)
    # The user asked for "our nameserver" info.
    # We will provide ns1.domain and ns2.domain pointing to the provided PowerDNS IP
    # User specified PowerDNS IP: 192.119.169.12
    pdns_ip = "192.119.169.12"
    ns_records = [
        {"host": f"ns1.{domain}", "value": pdns_ip},
        {"host": f"ns2.{domain}", "value": pdns_ip}
    ]

    return jsonify({
        "domain": domain,
        "server_ip": server_ip,
        "spf": spf_record,
        "dkim": dkim_record,
        "dmarc": dmarc_record,
        "ns_records": ns_records
    })


@app.route("/logs", methods=["POST"])
def get_logs():
    data = request.json
    server_ip = data["server_ip"]
    ssh_user = data["ssh_user"]
    ssh_pass = data["ssh_pass"]

    logs = ""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(server_ip, username=ssh_user, password=ssh_pass, timeout=10)
        stdin, stdout, stderr = ssh.exec_command("tail -n 100 /var/log/pmta/log")
        logs = stdout.read().decode('utf-8')
    except Exception as e:
        logs = f"Error fetching logs: {str(e)}"
    finally:
        ssh.close()

    return jsonify({
        "status": "success",
        "logs": logs
    })

def change_root_password(server_ip, current_user, current_pass, new_pass):
    """Changes the password for the CURRENT user (assumed root)"""
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(server_ip, username=current_user, password=current_pass, timeout=10)
        # Using chpasswd for batch update
        stdin, stdout, stderr = ssh.exec_command(f"echo '{current_user}:{new_pass}' | chpasswd")
        exit_code = stdout.channel.recv_exit_status()
        ssh.close()
        return exit_code == 0
    except Exception as e:
        print(f"Password Change Error: {e}")
        return False

def generate_temp_password(length=16):
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for i in range(length))

def run_install(data):
    print(">>> DEBUG: run_install thread STARTED", flush=True)
    
    server_ip = data["server_ip"]
    ssh_user = data["ssh_user"]
    ssh_pass = data["ssh_pass"] # The ORIGINAL password
    mappings = data["mappings"]
    fresh_install = data.get("fresh_install", False)
    
    # Generate Temp Password
    temp_pass = generate_temp_password()
    current_active_pass = ssh_pass # Track which password is currently active
    
    with open(INSTALL_LOG_FILE, "w", encoding="utf-8") as f:
        f.write("")

    def log(msg):
        try:
            with open(INSTALL_LOG_FILE, "a", encoding="utf-8") as f:
                f.write(msg + "\n")
            print(msg) 
        except Exception as e:
            print(f"FAILED TO WRITE LOG: {e}")

    # Helper functions need to use current_active_pass, not ssh_pass directly
    # So we need to redefine create_ssh_client or make it use a variable
    
    def create_ssh_client():
        retries = 3
        for attempt in range(retries):
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            try:
                # Use current_active_pass (dynamic)
                client.connect(server_ip, username=ssh_user, password=current_active_pass, timeout=60)
                return client
            except Exception as e:
                print(f"SSH Connection Attempt {attempt+1} Failed: {e}")
                if attempt < retries - 1:
                    time.sleep(5) 
                else:
                    log(f"!!! SSH Connection Failed after {retries} attempts: {e}")
                    return None

    # Redefine other helpers to use the new create_ssh_client scope...
    # Actually, simpler to just updating the `run_command` and `upload_file` to call the new `create_ssh_client`
    # passed above.
    
    # ... (Keep get_ptr, check_a_record helpers same) ...
    def get_ptr(ip):
        try:
            hostname, _, _ = socket.gethostbyaddr(ip)
            return hostname
        except socket.herror:
            return None
        except Exception:
            return None

    def check_a_record(hostname):
        try:
            msg_ip = socket.gethostbyname(hostname)
            return msg_ip
        except:
            return None

    def run_command(cmd, description):
        log(f"--- {description} ---")
        client = create_ssh_client()
        if not client: return False

        try:
            stdin, stdout, stderr = client.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            output = stdout.read().decode('utf-8')
            error_out = stderr.read().decode('utf-8')
            
            log(output)
            if error_out: log(f"STDERR: {error_out}")
            
            if exit_status != 0:
                log(f"!!! FAILED: {description} (Exit Code: {exit_status})")
                client.close()
                return False
            
            client.close()
            return True
        except Exception as e:
            log(f"!!! EXCEPTION: {e}")
            if client: client.close()
            return False

    def check_command(cmd):
        client = create_ssh_client()
        if not client: return False
        try:
            stdin, stdout, stderr = client.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            client.close()
            return exit_status == 0
        except:
            if client: client.close()
            return False

    def validate_pmta_config(config_str):
        issues = []
        
        # 1. Check for properly closed pools
        open_pools = config_str.count("<virtual-mta-pool")
        close_pools = config_str.count("</virtual-mta-pool>")
        if open_pools != close_pools:
            issues.append(f"Pool Mismatch: {open_pools} opened, {close_pools} closed")
        
        # 2. Check for Forbidden Directives in Domain Blocks
        lines = config_str.split('\n')
        in_domain = False
        curr_domain = ""
        
        for line in lines:
            line = line.strip()
            if line.startswith("<domain"):
                in_domain = True
                curr_domain = line
            elif line.startswith("</domain>"):
                in_domain = False
            
            if in_domain:
                # Forbidden directives
                if line.startswith("use-virtual-mta") or line.startswith("use-virtual-mta-pool") or "source-ip" in line:
                     issues.append(f"Forbidden Routing Directive in '{curr_domain}': {line}")
        
        # 3. Check for Mandatory Global Directives
        if "add-date-header yes" not in config_str:
            issues.append("Missing Mandatory Directive: 'add-date-header yes'")
            
        # 4. Safety Check: No Placeholder Domains
        if "myplatform.com" in config_str:
             issues.append("CRITICAL: Placeholder domain 'myplatform.com' found in config. Aborting!")

        return issues

    def upload_file(local_path, remote_path, force=False):
        if not os.path.exists(local_path):
             log(f"!!! Local file missing: {local_path}")
             return False

        client = create_ssh_client()
        if not client: return False

        try:
            sftp = client.open_sftp()
            try:
                if not force:
                    r_stat = sftp.stat(remote_path)
                    l_size = os.path.getsize(local_path)
                    if r_stat.st_size == l_size:
                        log(f"--- Upload {local_path} Success (Skipped - Already Exists) ---")
                        sftp.close()
                        client.close()
                        return True
            except IOError:
                pass

            log(f"Uploading {local_path} to {remote_path}...")
            sftp.put(local_path, remote_path)
            sftp.close()
            client.close()
            log(f"--- Upload {local_path} Success ---")
            return True
        except Exception as e:
            log(f"!!! Upload Failed: {e}")
            if client: client.close()
            return False

    def provision_remote_mailboxes(domain, password="password", script_path="manage_mailboxes.py"):
        """
        Connects to the central mail server and creates mailboxes for the given domain.
        """
        log(f">>> [MAIL-SERVER] Connecting to {MAIL_SERVER_IP} to provision mailboxes for {domain}...")
        
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            ssh.connect(MAIL_SERVER_IP, username=MAIL_SERVER_USER, password=MAIL_SERVER_PASS, timeout=10)
            
            # Determine Environment (Docker vs Native)
            log(f">>> [MAIL-SERVER] Detecting server config paths...")
            
            # Common Native Paths
            native_users = "/etc/dovecot/users"
            native_valias = "/etc/postfix/valias"  # or /etc/postfix/virtual
            native_vdomains = "/etc/postfix/vdomains"
            
            # Helper to check remote file existence
            def check_remote_file(f):
                stdin, stdout, stderr = ssh.exec_command(f"test -f {f} && echo 'YES' || echo 'NO'")
                return stdout.read().decode().strip() == 'YES'

            users_file = None
            valias_file = None
            vdomains_file = None
            is_native = False

            if check_remote_file(native_users):
                log(f">>> [MAIL-SERVER] Detected NATIVE installation (found {native_users})")
                users_file = native_users
                valias_file = native_valias if check_remote_file(native_valias) else "/etc/postfix/virtual"
                vdomains_file = native_vdomains if check_remote_file(native_vdomains) else "/etc/postfix/vdomains"
                is_native = True
            else:
                # Fallback to Docker Search Logic
                log(f">>> [MAIL-SERVER] '{native_users}' not found. Searching for Docker project...")
                search_cmd = "find /root /home /opt -name users -path '*/docker/dovecot/users' -print -quit 2>/dev/null"
                stdin, stdout, stderr = ssh.exec_command(search_cmd)
                found_path = stdout.read().decode('utf-8').strip()
                
                if found_path:
                     project_root = found_path.replace("/docker/dovecot/users", "")
                     log(f">>> [MAIL-SERVER] Found Docker project at: {project_root}")
                     users_file = f"{project_root}/docker/dovecot/users"
                     valias_file = f"{project_root}/docker/postfix/valias"
                     vdomains_file = f"{project_root}/docker/postfix/vdomains"
                else:
                     log("!!! [MAIL-SERVER] FATAL: Could not locate config files (NATIVE or DOCKER).")
                     ssh.close()
                     return False

            # Run the script remotely
            cmd = (
                f"python3 {remote_script} "
                f"--domain {domain} "
                f"--password {password} "
                f"--users-file {users_file} "
                f"--valias-file {valias_file} "
                f"--vdomains-file {vdomains_file} "
                f"&& rm {remote_script}" 
            )
            
            log(f">>> [MAIL-SERVER] Executing provisioning script...")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            out = stdout.read().decode('utf-8')
            err = stderr.read().decode('utf-8')
            
            if "SUCCESS" in out:
                log(f">>> [MAIL-SERVER] Mailboxes created successfully.\n{out}")
                
                # Restart Services
                log(f">>> [MAIL-SERVER] Restarting Postfix & Dovecot...")
                if is_native:
                    restart_cmd = "systemctl restart postfix dovecot"
                else:
                    restart_cmd = f"cd {project_root} && docker-compose restart postfix dovecot"
                
                stdin, stdout, stderr = ssh.exec_command(restart_cmd)
                exit_status = stdout.channel.recv_exit_status()
                if exit_status == 0:
                    log(">>> [MAIL-SERVER] Services restarted.")
                else:
                     log(f"!!! [MAIL-SERVER] Service restart failed: {stderr.read().decode()}")
            else:
                log(f"!!! [MAIL-SERVER] Provisioning script output:\n{out}\nError:\n{err}")

            ssh.close()
            return True
            
        except Exception as e:
            log(f"!!! [MAIL-SERVER] Connection/Provisioning failed: {e}")
            return False

    mode = data.get("mode", "install")
    
    # === CORE FLOW ===
    try:
        status_msg = "Starting installation checks..." if mode == "install" else "Starting bulk onboarding..."
        save_install_status({"status": "installing", "message": status_msg})
        log(f"=== {mode.upper()} Process Started ===")
        
        if mode == "install":
            # 0. FRESH SERVER CHECK (Strict)
            log(">>> [CHECK] Verifying Fresh Server Status...")
            check_client = create_ssh_client()
            if not check_client:
                raise Exception("Could not connect to server for initial check.")
            
            # Check for PMTA binary or config
            stdin, stdout, stderr = check_client.exec_command("test -f /usr/sbin/pmtad || test -f /etc/pmta/config && echo 'EXISTS' || echo 'CLEAN'")
            check_result = stdout.read().decode().strip()
            check_client.close()
            
            if check_result == 'EXISTS':
                msg = "Kindly use the fresh server all the time. Existing MTA detected."
                log("!!! ABORTING INSTALLATION !!!")
                log(msg) 
                # Save status for Dashboard to see
                save_install_status({"status": "error", "message": msg})
                raise Exception(msg)
            
            log(">>> Server is clean. Proceeding...")
    
            # 1. ROTATE PASSWORD (SECURITY)
            log(">>> [SECURITY] Rotating Server Password to Temporary One...")
            if change_root_password(server_ip, ssh_user, ssh_pass, temp_pass):
                current_active_pass = temp_pass
                log("Password changed successfully. Using Temporary Password.")
                log(f"SAFEGUARD: Temp Password is: {temp_pass}")
            else:
                log("!!! Failed to change password. Aborting for security.")
                return # Abort
    
            # 2. Upload Files
            log(">>> [STEP:UPLOAD] Uploading Core Files...")
    
            for f in PMTA_FILES:
                local_p = os.path.join(BASE_DIR, f)
                remote_p = f"/app/{f}" # We put everything in /app first
                
                # Create /app if not exists
                if not run_command("mkdir -p /app", "Create /app"): raise Exception("Failed to create remote dir")
                if not upload_file(local_p, remote_p): raise Exception(f"Failed to upload {f}")
    
            # 3. Install PowerMTA
            log(">>> [STEP:INSTALL] Checking PowerMTA Installation...")
            log("Running PowerMTA Installer...")
            
            try:
                with open(PMTA_INSTALL_SCRIPT, "r") as f:
                    script = f.read()
                
                # For the base installer, we just need a valid hostname to set /etc/hosts/hostname
                # We'll pick the first domain from mappings as the 'primary' system hostname
                primary_domain = mappings[0]["domain"] if mappings else "localhost.localdomain"
    
                script = script.replace("{{DOMAIN}}", primary_domain) 
                script = script.replace("{{SERVER_IP}}", server_ip)
                script = script.replace("{{SMTP_USER}}", "smtpuser")
                script = script.replace("{{SMTP_PASS}}", "smtppass")
    
                with tempfile.NamedTemporaryFile(delete=False, mode="wb", suffix=".sh") as tmp:
                    tmp.write(script.encode('utf-8'))
                    tmp_path = tmp.name
                
                if not upload_file(tmp_path, "/root/pmta-install.sh", force=True): raise Exception("Script upload failed")
                if not run_command("chmod +x /root/pmta-install.sh", "Set Execute Permission"): raise Exception("Chmod failed")
                if not run_command("bash /root/pmta-install.sh", "Run PMTA Installer"): raise Exception("Install Script failed")
    
            except Exception as e:
                log(f"Error preparing install script: {e}")
                raise
        else:
             log(">>> [MODE] Bulk Onboarding - Skipping Install/Fresh Checks.")
             # In onboarding mode, assume server is ready and we use the provided password (or temp pass if we knew it, but here we only have input pass)
             # User must provide current valid password for onboarding.
             pass

        # [NEW] Deduplication for Onboarding (Additive Mode)
        if mode == "onboard":
            log(">>> [ONBOARDING] Fetching existing config for deduplication...")
            ssh = create_ssh_client()
            if ssh:
                try:
                    stdin, stdout, stderr = ssh.exec_command("cat /etc/pmta/config")
                    current_config = stdout.read().decode('utf-8')
                    parsed_config = parse_pmta_config(current_config)
                    ssh.close()

                    # Extract existing IPs/Domains to check against
                    existing_ips = set()
                    for vmta in parsed_config.get("vmtas", []):
                        # vmta structure from parse: {'smtpSourceHost': 'ip host'}
                        parts = vmta.get("smtpSourceHost", "").split()
                        if len(parts) >= 1: existing_ips.add(parts[0])

                    # Filter mappings
                    new_mappings = []
                    for m in mappings:
                        if m["ip"] in existing_ips:
                            log(f"--- Skipping existing IP: {m['ip']}")
                        else:
                            new_mappings.append(m)
                    
                    if not new_mappings:
                        log("!!! No new IPs to onboard. All provided IPs already exist.")
                        save_install_status({"status": "installed", "message": "Onboarding Complete. No new items."})
                        print("> DEBUG: No new items. Finished.", flush=True)
                        return # Exit early

                    log(f"--- Onboarding {len(new_mappings)} new items (filtered from {len(mappings)}) ---")
                    mappings = new_mappings # Update main mappings list for generation

                except Exception as e:
                    log(f"!!! Error reading existing config: {e}")
                    ssh.close()
                    raise
            else:
                 raise Exception("Failed to connect for deduplication check")

        log(">>> [STEP:CONFIG] Generating Authoritative Configuration...")
        
        try:
            input_pool_name = data.get("pool", "pool1")
            input_user = data.get("smtp_user", {"username": "admin", "password": "password"})
            input_routing = data.get("routing", [])

            # 1. Prepare Data Structures
            domain_groups = {}
            for m in mappings:
                d = m["domain"]
                if d not in domain_groups: domain_groups[d] = []
                domain_groups[d].append(m["ip"])
            
            dkim_pub_keys = {} 

            # 2. Key Generation Loop (Pre-Check)
            log("--- Ensuring DKIM Keys on Server ---")
            ssh_client = create_ssh_client()
            if not ssh_client: raise Exception("Failed to create SSH client for DKIM key generation.")

            for d_name in domain_groups.keys():
                parts = d_name.split('.')
                root_domain = ".".join(parts[-2:]) if len(parts) > 2 else d_name
                selector = "default"
                dkim_key_Path = f"/etc/pmta/dkim/{root_domain}/{selector}.private"
                
                # Check/Gen
                ssh_client.exec_command(f"mkdir -p {os.path.dirname(dkim_key_Path)}")
                
                # Check/Gen Key
                check_cmd = (
                    f"if [ ! -f {dkim_key_Path} ]; then "
                    f"  openssl genrsa -out {dkim_key_Path} 2048; "
                    f"  openssl rsa -in {dkim_key_Path} -pubout > {dkim_key_Path}.pub; "
                    f"fi; "
                    # Enforce Permissions
                    f"chmod 755 /etc/pmta/dkim; "
                    f"chmod 755 {os.path.dirname(dkim_key_Path)}; "
                    f"chmod 640 {dkim_key_Path}; "
                    f"chown -R pmta:pmta /etc/pmta/dkim; "
                    # Output Pub Key
                    f"cat {dkim_key_Path}.pub"
                )
                stdin, stdout, stderr = ssh_client.exec_command(check_cmd)
                pub_key = stdout.read().decode('utf-8').strip()
                
                if pub_key:
                     dkim_pub_keys[d_name] = pub_key
                else:
                     log(f"Warning: Failed to get DKIM key for {d_name}")
            
            ssh_client.close()


            # 3. DNS Provisioning & Config Building
            vmta_blocks = []
            pool_blocks = []
            source_blocks = []
            user_blocks = []
            domain_blocks = []
            pattern_blocks = []
            
            vmta_names_all = []
            vmta_global_idx = 1
            
            # --- 3a. Provision CLIENT IDENTITY + Generate VMTA Blocks (Multi-Home Mode) ---
            # We treat every domain as its own sender identity (Client Mode)
            
            env = os.environ.copy()
            env["PDNS_API_KEY"] = "MyDNSApiKey2026"

            for d_name, ips in domain_groups.items():
                parts = d_name.split('.')
                root_domain = ".".join(parts[-2:]) if len(parts) > 2 else d_name
                
                # Retrieve key for DNS provisioning
                pub_key = dkim_pub_keys.get(d_name, "")
                
                # Provision Client Sender Identity (SPF/DKIM/DMARC)
                # Since we are making the domain the HOSTNAME of the IP, we SHOULD provision A/MX records too if possible?
                # The user asked for "Dashboard Input" to drive everything.
                # Let's assume full provisioning for the domain -> IPs mapping.
               
                if pub_key:
                    # Determine if we should provision A/MX (Infrastructure) or just SPF/DKIM (Client)
                    # If the domain is being used as the HELO host, it NEEDS an A record.
                    # We run in FULL mode (not client-only) for these domains.
                    
                    cmd_client = [
                        sys.executable, "pdns_automator.py",
                        "--domain", root_domain,
                        "--selector", "default",
                        "--dkim-key", pub_key,
                        "--dmarc-email", f"postmaster@{root_domain}"
                    ]
                    
                    # Pass Inbound IP for Split-Role DNS (MX -> Inbound)
                    inbound_ip = data.get("inbound_ip")
                    if inbound_ip:
                         cmd_client.extend(["--inbound-ip", inbound_ip])
                    
                    for ip in ips:
                        cmd_client.extend(["--ip", ip])
                        
                    subprocess.run(cmd_client, capture_output=True, env=env)
                
                domain_vmta_names = []
                
                for ip in ips:
                    # B. Build Config (CLIENT MODE: Source Host = Client Domain)
                    vmta_name = f"vmta{vmta_global_idx}"
                    dkim_path = f"/etc/pmta/dkim/{root_domain}/default.private"
                    dkim_line = f"    domain-key default,{root_domain},{dkim_path}"
                    
                # DYNAMIC: smtp-source-host uses the DOMAIN mapped in the dashboard
                    source_host_val = f"mail.{root_domain}"

                    vmta_blocks.append(f"<virtual-mta {vmta_name}>\n    smtp-source-host {ip} {source_host_val}\n{dkim_line}\n</virtual-mta>")
                    
                    domain_vmta_names.append(vmta_name)
                    vmta_names_all.append(vmta_name)
                    vmta_global_idx += 1
                
                # C. Build Domain Config
                # [MODIFIED] OUTBOUND ONLY - No Inbound Processing in PMTA
                # Removed: route run-pipe ...
                # Removed: deliver-local yes
                # We do NOT generate <domain> blocks for local delivery anymore.
                pass

            # 4. Finalize Config Blocks
            if vmta_names_all:
                pool_members = "\n    ".join([f"virtual-mta {n}" for n in vmta_names_all])
                pool_blocks.append(f"<virtual-mta-pool {input_pool_name}>\n    {pool_members}\n</virtual-mta-pool>")

            # Define Source for Authenticated Submission (Port 2525 or 587)
            source_blocks.append(f"<source {input_pool_name}>\n    always-allow-relaying yes\n    smtp-service yes\n    add-date-header yes\n    default-virtual-mta {input_pool_name}\n</source>")
            user_blocks.append(f"<smtp-user {input_user['username']}>\n    password {input_user['password']}\n    source {input_pool_name}\n</smtp-user>")

            if input_routing:
                pt_lines = []
                for r in input_routing:
                    pt_lines.append(f"    mail-from /{r['pattern']}/ virtual-mta={r['vmta']}")
                pattern_blocks.append("<pattern-list selections>\n" + "\n".join(pt_lines) + "\n</pattern-list>")

            final_config_str = "\n\n".join(
                vmta_blocks + pool_blocks + source_blocks + user_blocks + domain_blocks + pattern_blocks
            )

            # 5. Validate & Apply Config
            validation_issues = validate_pmta_config(final_config_str)
            if validation_issues:
                log("!!! CONFIG VALIDATION FAILED !!!")
                for issue in validation_issues:
                    log(f" - {issue}")
                raise Exception("Config validation failed.")

            if mode == "install":
                with open(PMTA_TEMPLATE, "r") as f:
                    script = f.read()

                script = script.replace("{{VMTA_BLOCK}}", final_config_str)
                script = script.replace("{{DOMAIN_BLOCK}}", "")
                script = script.replace("{{HOSTNAME}}", "localhost.localdomain") 

                with tempfile.NamedTemporaryFile(delete=False, mode="wb", suffix=".sh") as tmp:
                    safety_header = """# Safety: Backup existing config
    cp /etc/pmta/config /etc/pmta/config.bak
    """
                    final_script = safety_header + "\n" + script + """
    # Validate & Start
    echo "Validating Config..."
    /usr/sbin/pmtad --debug --dontSend > /var/log/pmta_validation.log 2>&1 &
    sleep 5
    systemctl restart pmta
    echo "Service Restarted."
    """
                    tmp.write(final_script.encode('utf-8'))
                    tmp_path = tmp.name
            else:
                # ADDITIVE SCRIPT GENERATION
                log(f">>> [ONBOARDING] Generating additive config script...")
                with tempfile.NamedTemporaryFile(delete=False, mode="wb", suffix=".sh") as tmp:
                    # Backup with timestamp
                    safety_header = f"cp /etc/pmta/config /etc/pmta/config.bak.$(date +%s)\n"
                    # Safe Append
                    final_script = safety_header + f"cat >> /etc/pmta/config <<'EOF'\n\n# --- BULK ONBOARDING ADDITION {datetime.now()} ---\n{final_config_str}\nEOF\n"
                    final_script += """
    # Validate & Restart
    echo "Validating Config..."
    /usr/sbin/pmtad --debug --dontSend > /var/log/pmta_validation.log 2>&1 &
    sleep 5
    systemctl restart pmta
    echo "Service Restarted."
    """
                    tmp.write(final_script.encode('utf-8'))
                    tmp_path = tmp.name

            if not upload_file(tmp_path, "/root/pmta-apply-config.sh"): raise Exception("Config apply script upload failed.")
            if not run_command("bash /root/pmta-apply-config.sh", "Apply Configuration"): raise Exception("Config application failed.")
            
            log(">>> [STEP:FINISH] PMTA configuration completed successfully.")

            # 6. Post-Config Compliance Audit
            log("\n>>> [AUDIT] Running Post-Install Compliance Check...")
            
            ptr_failures = []
            
            log("-" * 60)
            log(f"{'IP':<16} {'Current PTR':<25} {'Required PTR':<25} {'Result'}")
            log("-" * 60)
            
            for m in mappings:
                ip = m["ip"]
                d = m["domain"]
                parts = d.split('.')
                root_d = ".".join(parts[-2:]) if len(parts) > 2 else d
                
                # AUDIT CHANGE: Required PTR is now the dynamic host
                required_hostname = f"mail.{root_d}"
                
                ptr = get_ptr(ip)
                ptr_short = (ptr[:22] + '..') if ptr and len(ptr) > 25 else (ptr or "None")
                req_short = (required_hostname[:22] + '..') if len(required_hostname) > 25 else required_hostname
                
                status_msg = "✅ OK"
                
                # Case-insensitive comparison
                if not ptr or (ptr.lower() != required_hostname.lower()):
                    status_msg = "⚠ PTR update required"
                    ptr_failures.append({"ip": ip, "required": required_hostname, "current": ptr})
                
                log(f"{ip:<16} {ptr_short:<25} {req_short:<25} {status_msg}")
            
            log("-" * 60)

            if ptr_failures:
                log("\nIMPORTANT INFRASTRUCTURE AUDIT:")
                log("The following IPs do not have the correct PTR record:")
                for fail in ptr_failures:
                    current_val = fail['current'] if fail['current'] else "None"
                    log(f"IP: {fail['ip']}")
                    log(f"Current PTR : {current_val}")
                    log(f"Required PTR: {fail['required']} (Domain Identity)")
                    log(f"Action: Update PTR for {fail['ip']} -> {fail['required']}\n")
            else:
                log("\n>>> Perfect! All IPs match their Domain Identity.")

            # 7. Multi-Server: Provision Mailboxes on Mail Server
            log("\n>>> [MULTI-SERVER] Provisioning Inbound Mailboxes...")
            # We provision for each domain in the mapping
            # (Assuming one password for all for simplicity, or using the smtp_pass from install request)
            # The install request usually has 'smtp_user' object with password.
            
            common_password = input_user.get("password", "password")
            
            for d_name in domain_groups.keys():
                 provision_remote_mailboxes(d_name, common_password)
            
            log("\n=== Installation & Provisioning Complete ===")
            
            # Save Status for Dashboard
            # Save Status for Dashboard
            save_install_status({
                "status": "installed",
                "server_ip": server_ip,
                "ssh_user": ssh_user,
                "ssh_pass": current_active_pass, # Storing the ROTATED password
                "smtp_user": input_user['username'],
                "smtp_pass": input_user['password'],
                "roundcube_url": f"http://{MAIL_SERVER_IP}", # Port 80 is default
                "installed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "mappings": mappings,
                "ptr_results": ptr_failures
            })

        except Exception as e:
            log(f"!!! Installation Failed: {e}")
            import traceback
            log(traceback.format_exc())
            raise # Re-raise to be caught by outer try-except

    except Exception as e:
        log(f"!!! CRITICAL ERROR DURING INSTALL: {e}")
        import traceback
        log(traceback.format_exc())
        save_install_status({"status": "error", "message": f"Critical Installation Error: {str(e)}"})

    finally:
        # 2. REVERT PASSWORD
        log(">>> [SECURITY] Reverting Server Password...")
        # Try to revert using the CURRENT active password (which should be temp_pass)
        if current_active_pass == temp_pass:
            if change_root_password(server_ip, ssh_user, temp_pass, ssh_pass):
                log("Password reverted successfully. Security context restored.")
            else:
                log("!!! FATAL: FAILED TO REVERT PASSWORD. SERVER IS STUCK ON TEMP PASSWORD.")
                log(f"!!! Temp Password: {temp_pass}")
        else:
             log("Password was not rotated or already reverted.")

@app.route("/install_logs", methods=["GET"])
def get_install_logs():
    if os.path.exists(INSTALL_LOG_FILE):
        try:
            with open(INSTALL_LOG_FILE, "r", encoding="utf-8") as f:
                return jsonify({"logs": f.read()})
        except Exception:
             return jsonify({"logs": "Error reading log file"})
    return jsonify({"logs": ""})

@app.route("/dns/records", methods=["GET"])
def get_dns_records():
    domain = request.args.get("domain")
    if not domain: return jsonify({"error": "Domain is required"}), 400
    if not domain.endswith("."): domain += "."

    PDNS_HOST = "192.119.169.12"
    PDNS_PORT = "8081"
    API_KEY = "MyDNSApiKey2026"
    
    url = f"http://{PDNS_HOST}:{PDNS_PORT}/api/v1/servers/localhost/zones/{domain}"
    headers = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

    try:
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            rrsets = data.get("rrsets", [])
            ns_records = []
            other_records = []

            for rr in rrsets:
                if rr["type"] == "NS":
                    for r in rr["records"]: ns_records.append(r["content"])
                else:
                    for r in rr["records"]:
                        other_records.append({
                            "name": rr["name"],
                            "type": rr["type"],
                            "ttl": rr["ttl"],
                            "content": r["content"]
                        })
            return jsonify({
                "status": "success",
                "domain": domain,
                "nameservers": ns_records,
                "records": other_records
            })
        elif resp.status_code == 404:
             return jsonify({"error": "Zone not found"}), 404
        else:
             return jsonify({"error": f"PowerDNS Error: {resp.text}"}), resp.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("----------------------------------------------------------------")
    print(">>> BACKEND STARTING - VERSION: ABSOLUTE PATH FIX")
    print(f">>> LOG FILE: {INSTALL_LOG_FILE}")
    print("----------------------------------------------------------------")
    app.run(host="0.0.0.0", port=5000, debug=False)
