#!/usr/bin/env bash
# =====================================================================
# scripts/vm_startup.sh - VM Startup Script for Sovereign Gemma 2 (2B)
# =====================================================================
set -eo pipefail

export HOME="${HOME:-/root}"
export DEBIAN_FRONTEND=noninteractive

echo "[Argolis Bootstrap] Updating packages and installing dependencies..."
apt-get update -y && apt-get install -y curl jq sysstat cron

echo "[Argolis Bootstrap] Installing Google Cloud Ops Agent for Cloud Logging ingestion..."
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh && bash add-google-cloud-ops-agent-repo.sh --also-install || true

echo "[Argolis Bootstrap] Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

echo "[Argolis Bootstrap] Configuring Ollama systemd service to listen on 0.0.0.0:8001..."
mkdir -p /etc/systemd/system/ollama.service.d
cat <<'OLLAMA_CONF' > /etc/systemd/system/ollama.service.d/override.conf
[Service]
Environment="OLLAMA_HOST=0.0.0.0:8001"
OLLAMA_CONF

mkdir -p /usr/share/ollama/.ollama
chown -R ollama:ollama /usr/share/ollama

systemctl daemon-reload
systemctl restart ollama
sleep 5

echo "[Argolis Bootstrap] Pulling google/gemma-2-2b-it (gemma2:2b)..."
HOME=/usr/share/ollama OLLAMA_HOST=127.0.0.1:8001 ollama pull gemma2:2b

echo "[Argolis Bootstrap] Configuring Argolis Auto-Stop Protections..."

# 1. Daily hard shutdown at 19:00 (7:00 PM local server time)
cat <<'CRON_DAILY' > /etc/cron.d/argolis_daily_shutdown
0 19 * * * root /sbin/shutdown -h now "Argolis automated evening shutdown"
CRON_DAILY
chmod 644 /etc/cron.d/argolis_daily_shutdown

# 2. Idle Watchdog Script: Shuts down VM if CPU load < 0.10 for 60 consecutive minutes
cat <<'IDLE_SCRIPT' > /usr/local/bin/argolis_idle_watchdog.sh
#!/usr/bin/env bash
STATE_FILE="/tmp/argolis_idle_count"
LOAD=$(awk '{print $1}' /proc/loadavg)
IS_IDLE=$(awk -v load="$LOAD" 'BEGIN {if (load < 0.10) print 1; else print 0}')

if [ "$IS_IDLE" -eq 1 ]; then
    COUNT=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
    COUNT=$((COUNT + 1))
    echo "$COUNT" > "$STATE_FILE"
    if [ "$COUNT" -ge 4 ]; then
        logger -t ArgolisWatchdog "VM idle for >= 60 minutes. Initiating automated shutdown."
        /sbin/shutdown -h now "Argolis automated idle shutdown"
    fi
else
    echo 0 > "$STATE_FILE"
fi
IDLE_SCRIPT
chmod +x /usr/local/bin/argolis_idle_watchdog.sh

# Run idle watchdog every 15 minutes
cat <<'CRON_IDLE' > /etc/cron.d/argolis_idle_watchdog
*/15 * * * * root /usr/local/bin/argolis_idle_watchdog.sh
CRON_IDLE
chmod 644 /etc/cron.d/argolis_idle_watchdog

echo "[Argolis Bootstrap] SUCCESS: Gemma 2 (2B) and Auto-Stop initialized."
