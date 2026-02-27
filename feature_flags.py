# Stability Sandbox Feature Flags
# Controls the rollout of new features without breaking existing functionality.

DISABLE_ALL_NEW_FEATURES = False # Master kill switch if needed

# Phase A: Live DNS Fetch
# If True, DNS tab fetches from PowerDNS API instead of static DB records.
ENABLE_LIVE_DNS = True

# Phase B: Raw Config Protection
# If False, the Raw Config tab is hidden or read-only.
# Defaults to True to maintain legacy behavior until explicitly disabled.
ALLOW_RAW_CONFIG = True 

# Phase C: Structured Config Editor
# If True, enables the SMTP and Settings tabs to perform updates.
ENABLE_STRUCTURED_EDITOR = True

# Phase D: VMTA Management
# If True, shows the VMTA Management tab.
ENABLE_VMTA_MANAGER = True
