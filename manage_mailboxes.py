#!/usr/bin/env python3
import os
import sys
import argparse
import re

# Defaults for Docker setup (Fallback)
DEFAULT_USERS_FILE = "docker/dovecot/users"
DEFAULT_VALIAS_FILE = "docker/postfix/valias"
DEFAULT_VDOMAINS_FILE = "docker/postfix/vdomains"

REQUIRED_MAILBOXES = ["postmaster", "abuse", "reply", "support"]
FORBIDDEN_MAILBOXES = ["bounce"]

def log(msg):
    print(f"[+] {msg}")

def error(msg):
    print(f"[!] ERROR: {msg}")
    sys.exit(1)

def validate_file(f):
    if not os.path.exists(f):
        # Determine directory
        d = os.path.dirname(f)
        if not os.path.exists(d):
            error(f"Directory not found: {d}\n    Cannot manage mailboxes if base directories don't exist.")
        
        # If file is missing but dir exists, we can maybe create it? 
        # Better to warn.
        log(f"Warning: File {f} does not exist. Creating new.")
        try:
           with open(f, 'w') as fp: fp.write("")
        except Exception as e:
           error(f"Cannot create {f}: {e}")

def add_mailbox(domain, password, users_file, valias_file, vdomains_file):
    log(f"Processing domain: {domain}")
    
    validate_file(users_file)
    validate_file(valias_file)
    validate_file(vdomains_file)

    # 1. Update Postfix VDOMAINS
    with open(vdomains_file, "r") as f:
        vdomains = f.read().splitlines()
    
    if domain not in vdomains:
        log(f"Adding '{domain}' to {vdomains_file}")
        with open(vdomains_file, "a") as f:
            f.write(f"{domain}\n")
    else:
        log(f"Domain '{domain}' already in vdomains.")

    # 2. Update Dovecot USERS
    # Format: user@domain:{PLAIN}password:5000:5000::/var/mail/vhosts/domain/user::
    with open(users_file, "r") as f:
        current_users = f.read()
    
    users_modified = False
    
    for user in REQUIRED_MAILBOXES:
        full_user = f"{user}@{domain}"
        
        # Check forbidden
        if user in FORBIDDEN_MAILBOXES:
            log(f"SKIPPING forbidden mailbox: {full_user}")
            continue

        # Check existing
        if f"{full_user}:" in current_users:
            log(f"User '{full_user}' already exists. Skipping.")
            continue
        
        log(f"Creating User: {full_user}")
        # Dovecot User Entry
        # Note: uid/gid 5000 is 'vmail' in our docker setup. 
        # Check native server UID/GID for vmail. Usually 5000 or similar.
        # We will stick to 5000 for consistency unless user complains.
        home_dir = f"/var/mail/vhosts/{domain}/{user}"
        entry = f"{full_user}:{{PLAIN}}{password}:5000:5000::{home_dir}::\n"
        
        with open(users_file, "a") as f:
            f.write(entry)
        users_modified = True

    # 3. Update Postfix VALIAS
    escaped_domain = re.escape(domain)
    
    with open(valias_file, "r") as f:
        valias_lines = f.readlines()
    
    new_valias_lines = []
    valias_modified = False
    
    new_rules = []
    existing_rules_str = "".join(valias_lines)

    for user in REQUIRED_MAILBOXES:
        if user in FORBIDDEN_MAILBOXES: continue

        # Regex format for Postfix
        # /^postmaster@example\.com$/ example.com/postmaster/
        regex_pattern = f"/^{user}@{escaped_domain}$/"
        destination = f"{domain}/{user}/"
        rule_line = f"{regex_pattern}   {destination}\n"

        if regex_pattern in existing_rules_str:
            log(f"Alias rule for {user}@{domain} already exists.")
        else:
            log(f"Adding Alias Rule: {user}@{domain} -> {destination}")
            new_rules.append(rule_line)

    if new_rules:
        new_rules.append("\n") # Spacer
        # Prepend
        final_lines = new_rules + valias_lines
        with open(valias_file, "w") as f:
            f.writelines(final_lines)
        valias_modified = True
    
    if users_modified or valias_modified:
        log(f"\nSUCCESS: Configuration files updated.")
    else:
        log("No changes were necessary (configuration already matches).")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Automate Mailbox Creation for Server B")
    parser.add_argument("--domain", required=True, help="Domain name (e.g., example.com)")
    parser.add_argument("--password", required=True, help="Password for the mailboxes")
    parser.add_argument("--users-file", default=DEFAULT_USERS_FILE, help="Path to Dovecot users file")
    parser.add_argument("--valias-file", default=DEFAULT_VALIAS_FILE, help="Path to Postfix valias file")
    parser.add_argument("--vdomains-file", default=DEFAULT_VDOMAINS_FILE, help="Path to Postfix vdomains file")

    args = parser.parse_args()
    
    add_mailbox(args.domain, args.password, args.users_file, args.valias_file, args.vdomains_file)
