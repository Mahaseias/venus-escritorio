"""Adaptador Claude Code. Somente metadados mínimos saem da máquina."""
import hashlib
import json
import os
import sys
import urllib.request

def main():
    event = json.load(sys.stdin)
    kind = event.get("hook_event_name")
    child = kind in ("SubagentStart", "SubagentStop")
    if child:
        aliases = json.loads(os.getenv("VENUS_AGENT_MAP", "{}"))
        role = aliases.get(event.get("agent_type"), event.get("agent_type"))
        identity = event.get("agent_id")
    else:
        role = os.getenv("VENUS_ROLE")
        identity = event.get("session_id")
    if not role or not identity:
        return
    active = kind in ("UserPromptSubmit", "PreToolUse", "SubagentStart")
    key = hashlib.sha256(identity.encode()).hexdigest()
    data = json.dumps(dict(role=role, session=key, active=active)).encode()
    url = os.environ["VENUS_URL"].rstrip("/") + "/api/event"
    request = urllib.request.Request(url, data, {"Authorization": "Bearer " + os.environ["OFFICE_TOKEN"], "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=2):
        pass

try:
    main()
except Exception:
    print("Venus: evento não entregue.", file=sys.stderr)
