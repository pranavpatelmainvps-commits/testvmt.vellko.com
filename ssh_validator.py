import re
import socket
import time
from typing import Any, Dict, List, Optional

import paramiko


def _exec(ssh: paramiko.SSHClient, command: str, timeout: int = 10) -> Dict[str, Any]:
    stdin, stdout, stderr = ssh.exec_command(command, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return {"exit_code": exit_code, "stdout": out, "stderr": err}


def _parse_os_release(text: str) -> Optional[str]:
    pretty = None
    name = None
    version = None

    for raw in text.splitlines():
        line = raw.strip()
        if not line or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if k == "PRETTY_NAME":
            pretty = v
        elif k == "NAME":
            name = v
        elif k == "VERSION":
            version = v

    if pretty:
        return pretty
    if name and version:
        return f"{name} {version}"
    return name


def _parse_free_m(text: str) -> Optional[int]:
    for raw in text.splitlines():
        line = raw.strip()
        if line.lower().startswith("mem:"):
            parts = re.split(r"\s+", line)
            if len(parts) >= 2:
                try:
                    return int(parts[1])
                except ValueError:
                    return None
    return None


def _parse_df_h_root_available(text: str) -> Optional[str]:
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if len(lines) < 2:
        return None
    parts = re.split(r"\s+", lines[1].strip())
    if len(parts) >= 4:
        return parts[3]
    return None


def validate_ssh_server(
    host: str,
    username: str,
    password: str,
    port: int = 22,
    timeout_seconds: int = 10,
) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "success": False,
        "os": None,
        "pmta_installed": False,
        "ports_in_use": [],
        "ram_mb": None,
        "disk_available": None,
        "cpu_cores": None,
        "load_average": None,
        "is_root": None,
        "package_manager": None,
        "port25_outbound": None,
        "ssh_latency_ms": None,
        "errors": [],
    }

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(
            hostname=host,
            port=int(port or 22),
            username=username,
            password=password,
            timeout=timeout_seconds,
            banner_timeout=timeout_seconds,
            auth_timeout=timeout_seconds,
            look_for_keys=False,
            allow_agent=False,
        )
    except paramiko.AuthenticationException:
        result["errors"].append("Authentication failure")
        return result
    except (socket.timeout, TimeoutError):
        result["errors"].append("Timeout (10 seconds)")
        return result
    except Exception as e:
        result["errors"].append(f"SSH failure: {str(e)}")
        return result

    try:
        # --- OS Detection ---
        os_r = _exec(ssh, "cat /etc/os-release", timeout=timeout_seconds)
        if os_r["exit_code"] == 0 and os_r["stdout"].strip():
            result["os"] = _parse_os_release(os_r["stdout"]) or "Other"
        else:
            uname_r = _exec(ssh, "uname -a", timeout=timeout_seconds)
            if uname_r["exit_code"] == 0 and uname_r["stdout"].strip():
                result["os"] = uname_r["stdout"].strip()
            else:
                result["os"] = "Unknown Linux"

        # --- PMTA Check ---
        pmta_r = _exec(ssh, "which pmta", timeout=timeout_seconds)
        result["pmta_installed"] = bool(pmta_r["stdout"].strip()) and pmta_r["exit_code"] == 0

        # --- Port Check ---
        ports_r = _exec(ssh, r"ss -tulnp | grep -E ':25|:587|:80|:443'", timeout=timeout_seconds)
        if ports_r["exit_code"] != 0:
            ports_r = _exec(ssh, r"netstat -tulnp | grep -E ':25|:587|:80|:443'", timeout=timeout_seconds)
        ports: List[str] = []
        if ports_r["exit_code"] == 0:
            for ln in ports_r["stdout"].splitlines():
                s = ln.strip()
                if s:
                    ports.append(s)
        result["ports_in_use"] = ports

        # --- RAM Check ---
        ram_r = _exec(ssh, "free -m", timeout=timeout_seconds)
        if ram_r["exit_code"] == 0:
            result["ram_mb"] = _parse_free_m(ram_r["stdout"])

        # --- Disk Check ---
        disk_r = _exec(ssh, "df -h /", timeout=timeout_seconds)
        if disk_r["exit_code"] == 0:
            result["disk_available"] = _parse_df_h_root_available(disk_r["stdout"])

        # --- CPU Check ---
        try:
            cpu_r = _exec(ssh, "nproc", timeout=timeout_seconds)
            if cpu_r["exit_code"] == 0 and cpu_r["stdout"].strip():
                result["cpu_cores"] = int(cpu_r["stdout"].strip())
        except Exception:
            pass

        try:
            load_r = _exec(ssh, "uptime", timeout=timeout_seconds)
            if load_r["exit_code"] == 0 and load_r["stdout"].strip():
                m = re.search(r"load average[s]?:\s*([\d.]+)", load_r["stdout"])
                if m:
                    result["load_average"] = m.group(1)
        except Exception:
            pass

        # --- Root Access Check ---
        try:
            root_r = _exec(ssh, "whoami", timeout=timeout_seconds)
            if root_r["exit_code"] == 0:
                result["is_root"] = root_r["stdout"].strip().lower() == "root"
        except Exception:
            pass

        # --- Package Manager Check ---
        try:
            pm_r = _exec(ssh, "which apt 2>/dev/null || which yum 2>/dev/null || which dnf 2>/dev/null", timeout=timeout_seconds)
            if pm_r["exit_code"] == 0 and pm_r["stdout"].strip():
                pm_path = pm_r["stdout"].strip().splitlines()[0].strip()
                if "apt" in pm_path:
                    result["package_manager"] = "apt"
                elif "dnf" in pm_path:
                    result["package_manager"] = "dnf"
                elif "yum" in pm_path:
                    result["package_manager"] = "yum"
                else:
                    result["package_manager"] = pm_path
        except Exception:
            pass

        # --- Outbound Port 25 Check ---
        try:
            p25_r = _exec(ssh, 'timeout 5 bash -c "</dev/tcp/gmail-smtp-in.l.google.com/25" 2>&1 && echo PORT25_OK || echo PORT25_FAIL', timeout=15)
            if p25_r["exit_code"] == 0 and "PORT25_OK" in p25_r["stdout"]:
                result["port25_outbound"] = True
            else:
                result["port25_outbound"] = False
        except Exception:
            result["port25_outbound"] = False

        # --- SSH Latency Check ---
        try:
            t0 = time.time()
            _exec(ssh, "echo test", timeout=timeout_seconds)
            elapsed_ms = round((time.time() - t0) * 1000, 1)
            result["ssh_latency_ms"] = elapsed_ms
        except Exception:
            pass

        # --- Validation Score/Status ---
        score = 100

        if result.get("pmta_installed") is True:
            score -= 40

        ports_in_use = result.get("ports_in_use") or []
        if isinstance(ports_in_use, list) and len(ports_in_use) > 0:
            score -= 30

        ram_mb = result.get("ram_mb")
        try:
            if ram_mb is not None and int(ram_mb) < 2048:
                score -= 20
        except Exception:
            pass

        disk_avail = result.get("disk_available")
        try:
            if isinstance(disk_avail, str) and disk_avail.strip():
                m = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)\s*([KMGTP])\s*$", disk_avail.strip(), re.IGNORECASE)
                if m:
                    val = float(m.group(1))
                    unit = m.group(2).upper()
                    gb = val
                    if unit == "K":
                        gb = val / (1024 * 1024)
                    elif unit == "M":
                        gb = val / 1024
                    elif unit == "G":
                        gb = val
                    elif unit == "T":
                        gb = val * 1024
                    elif unit == "P":
                        gb = val * 1024 * 1024
                    if gb < 10:
                        score -= 20
        except Exception:
            pass

        os_name = result.get("os")
        try:
            os_l = (os_name or "").lower()
            if ("ubuntu" not in os_l) and ("centos" not in os_l):
                score -= 30
        except Exception:
            score -= 30

        # New deductions
        if result.get("is_root") is False:
            score -= 30

        if result.get("port25_outbound") is False:
            score -= 40

        try:
            cpu = result.get("cpu_cores")
            if cpu is not None and int(cpu) < 2:
                score -= 20
        except Exception:
            pass

        if score < 0:
            score = 0
        if score > 100:
            score = 100

        if score >= 80:
            status = "ready"
        elif score >= 50:
            status = "warning"
        else:
            status = "failed"

        result["score"] = score
        result["status"] = status

        # --- Human-readable warnings ---
        warnings: List[str] = []

        if result.get("pmta_installed") is True:
            warnings.append("PMTA already installed on server")

        if result.get("ports_in_use"):
            warnings.append("Required ports are already in use")

        try:
            _ram = result.get("ram_mb")
            if _ram is not None and int(_ram) < 2048:
                warnings.append("Low RAM (minimum 2GB recommended)")
        except Exception:
            pass

        try:
            _disk = result.get("disk_available")
            if isinstance(_disk, str) and _disk.strip():
                _m = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)\s*([KMGTP])\s*$", _disk.strip(), re.IGNORECASE)
                if _m:
                    _v = float(_m.group(1))
                    _u = _m.group(2).upper()
                    _gb = _v
                    if _u == "K":
                        _gb = _v / (1024 * 1024)
                    elif _u == "M":
                        _gb = _v / 1024
                    elif _u == "T":
                        _gb = _v * 1024
                    elif _u == "P":
                        _gb = _v * 1024 * 1024
                    if _gb < 10:
                        warnings.append("Low disk space (minimum 10GB required)")
        except Exception:
            pass

        if result.get("is_root") is False:
            warnings.append("Root access required for installation")

        if result.get("port25_outbound") is False:
            warnings.append("Port 25 is blocked (email sending will fail)")

        try:
            _cpu = result.get("cpu_cores")
            if _cpu is not None and int(_cpu) < 2:
                warnings.append("Low CPU (minimum 2 cores recommended)")
        except Exception:
            pass

        try:
            _lat = result.get("ssh_latency_ms")
            if _lat is not None and float(_lat) > 200:
                warnings.append("High SSH latency (slow server)")
        except Exception:
            pass

        result["warnings"] = warnings

        result["success"] = True
        return result
    except (socket.timeout, TimeoutError):
        result["errors"].append("Timeout (10 seconds)")
        return result
    except Exception as e:
        result["errors"].append(f"SSH failure: {str(e)}")
        return result
    finally:
        try:
            ssh.close()
        except Exception:
            pass
