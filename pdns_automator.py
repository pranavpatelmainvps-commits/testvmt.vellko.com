#!/usr/bin/env python3
import os
import sys
import argparse
import requests
import re

# ================= CONFIGURATION =================
PDNS_HOST = "192.119.169.12" 
PDNS_PORT = "8081"
BASE_URL = f"http://{PDNS_HOST}:{PDNS_PORT}/api/v1/servers/localhost"
DEFAULT_TTL = 300

def get_api_key():
    api_key = os.environ.get("PDNS_API_KEY")
    if api_key: return api_key.strip()
    return "MyDNSApiKey2026"

def get_headers(api_key):
    return {
        "X-API-Key": api_key,
        "Content-Type": "application/json"
    }

def validate_domain(domain):
    if not domain: return None
    domain = domain.strip().rstrip('.')
    if "example" in domain.lower(): return None
    return domain + "."

def ensure_zone(domain, headers):
    zone_url = f"{BASE_URL}/zones/{domain}"
    try:
        if requests.get(zone_url, headers=headers).status_code == 200:
            return
        
        # Create Native Zone
        payload = {
            "name": domain,
            "kind": "Native",
            "nameservers": [f"ns1.{domain}", f"ns2.{domain}"]
        }
        requests.post(f"{BASE_URL}/zones", headers=headers, json=payload)
    except:
        sys.exit(1)

def create_records(domain, ips, hostname, selector, dkim_key, dmarc_email, headers, client_only=False, inbound_ip=None):
    rrsets = []
    
    def make_rrset(name, type_, content_list):
        return {
            "name": name,
            "type": type_,
            "ttl": DEFAULT_TTL,
            "changetype": "REPLACE",
            "records": [{"content": c, "disabled": False} for c in content_list]
        }

    # ---------------------------------------------------------
    # 1. INFRASTRUCTURE RECORDS (A / MX)
    # ---------------------------------------------------------
    if not client_only:
        # A. Inbound / MX Wiring
        # If inbound_ip is provided, it handles MX and 'mail' hostname
        target_mx_ip = inbound_ip if inbound_ip else ips[0]
        
        # mail.domain -> Inbound IP (or single server IP)
        rrsets.append(make_rrset(f"mail.{domain}", "A", [target_mx_ip]))
        
        # bounce.domain -> Inbound IP (for CNAME or A transparency)
        rrsets.append(make_rrset(f"bounce.{domain}", "A", [target_mx_ip]))
        
        # MX Record -> mail.domain
        rrsets.append(make_rrset(domain, "MX", [f"10 mail.{domain}"]))
        
        # B. Outbound Wiring (PMTA Nodes)
        # Create pmta1, pmta2... for each outbound IP
        for idx, ip in enumerate(ips):
            node_name = f"pmta{idx+1}.{domain}"
            rrsets.append(make_rrset(node_name, "A", [ip]))
            
        # Root A Record -> Usually Web Server or Redirect, defaulting to Outbound IP 1 for now
        # OR we can skip this if the user has a separate website. 
        # Requirement: "A records: ... pmta1... bounce..." 
        # It didn't strictly say @ must match mail, but usually it does for reputation.
        # Let's point @ to the mail IP (Inbound) so webmail is accessible if they try root?
        # Or Outbound? Most "warmup" tools check if root resolves.
        # Strict Rule: "mail.quicklendings.com -> 212... (Inbound)"
        # Let's set root to target_mx_ip (Inbound) to match 'mail' for consistency
        rrsets.append(make_rrset(domain, "A", [target_mx_ip]))


    # ---------------------------------------------------------
    # 2. AUTHENTICATION RECORDS (SPF / DKIM / DMARC)
    # ---------------------------------------------------------
    
    # SPF: Must include ALL Outbound IPs
    spf_parts = ["v=spf1"]
    for ip in ips:
        spf_parts.append(f"ip4:{ip}")
    spf_parts.append("-all")
    rrsets.append(make_rrset(domain, "TXT", [f"\"{' '.join(spf_parts)}\""]))

    # DKIM
    if dkim_key and dkim_key.lower() != "none":
        dkim_clean = dkim_key.replace("-----BEGIN PUBLIC KEY-----", "").replace("-----END PUBLIC KEY-----", "").replace("\n", "").strip()
        dkim_val = f"\"v=DKIM1; k=rsa; p={dkim_clean}\""
        rrsets.append(make_rrset(f"{selector}._domainkey.{domain}", "TXT", [dkim_val]))

    # DMARC
    dmarc_val = f"\"v=DMARC1; p=none; rua=mailto:{dmarc_email}; ruf=mailto:{dmarc_email}; fo=1\""
    rrsets.append(make_rrset(f"_dmarc.{domain}", "TXT", [dmarc_val]))

    # Batch Update
    zone_url = f"{BASE_URL}/zones/{domain}"
    try:
        requests.patch(zone_url, headers=headers, json={"rrsets": rrsets})
        print(f"DNS Provisioned for {domain}")
        if inbound_ip:
            print(f" > Inbound (MX): {inbound_ip}")
        print(f" > Outbound (SPF): {', '.join(ips)}")
        
    except Exception as e:
        print(f"DNS Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", required=True)
    parser.add_argument("--ip", action='append', required=True, help="Outbound (PMTA) IPs")
    parser.add_argument("--inbound-ip", required=False, help="Inbound (Mailbox) IP for MX/mail.subdomain")
    parser.add_argument("--hostname", required=False, help="PTR-derived Hostname (Unused in new logic but kept for compat)")
    parser.add_argument("--selector", required=True)
    parser.add_argument("--dkim-key", required=True)
    parser.add_argument("--dmarc-email", required=True)
    parser.add_argument("--client-only", action="store_true", help="Skip A/MX records, only provision SPF/DKIM/DMARC")
    
    args = parser.parse_args()
    
    api_key = get_api_key()
    headers = get_headers(api_key)
    
    domain = validate_domain(args.domain)
    if not domain:
        print("Invalid Domain")
        sys.exit(1)
        
    ensure_zone(domain, headers) 
    create_records(domain, args.ip, args.hostname, args.selector, args.dkim_key, args.dmarc_email, headers, client_only=args.client_only, inbound_ip=args.inbound_ip)

