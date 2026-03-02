#!/bin/bash
set -e

# Start SSH
echo "Starting SSH..."
/usr/sbin/sshd

# Start PMTA if installed
if [ -f /usr/sbin/pmtad ]; then
    echo "Configuring PMTA Hostname..."
    mkdir -p /etc/pmta/
    if ! grep -q "host-name " /etc/pmta/config 2>/dev/null; then
        echo "host-name testvmt.vellko.com" >> /etc/pmta/config
    fi

    echo "Starting PowerMTA..."
    /usr/sbin/pmtad
    
    # Simple way to keep container alive and show logs
    # We tail the PMTA log if it exists, otherwise just wait
    touch /var/log/pmta/log
    tail -f /var/log/pmta/log
else
    echo "PowerMTA not found. Keeping container alive for debugging..."
    tail -f /dev/null
fi
