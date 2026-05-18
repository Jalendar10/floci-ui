#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Floci UI Launcher
#
# Builds Floci + the UI from source on first run, then starts both together
# inside a single Docker container. No separate setup needed.
#
# Usage: ./start.sh           → build (if needed) and start
#        ./start.sh stop      → stop
#        ./start.sh logs      → tail logs
#        ./start.sh status    → show status
#        ./start.sh update    → pull latest Floci source, rebuild, restart
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

IMAGE="floci-ui:latest"
CONTAINER="floci-ui"
UI_PORT=3000
API_PORT=4566
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colours ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}▸${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET} $*"; }
error()   { echo -e "${RED}✗${RESET} $*" >&2; }
banner()  { echo -e "\n${BOLD}$*${RESET}\n"; }

# ── Helpers ────────────────────────────────────────────────────────────────
OS="$(uname -s)"

docker_installed() { command -v docker &>/dev/null; }
docker_running()   { docker info &>/dev/null 2>&1; }

# ── Install Docker ─────────────────────────────────────────────────────────
install_docker_linux() {
    info "Installing Docker Engine on Linux..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
    rm /tmp/get-docker.sh

    if command -v systemctl &>/dev/null; then
        sudo systemctl enable docker --now 2>/dev/null || true
    fi

    if ! groups | grep -q docker; then
        sudo usermod -aG docker "$USER" 2>/dev/null || true
        warn "Added $USER to the docker group. You may need to log out and back in."
    fi
    success "Docker installed."
}

install_docker_mac() {
    if command -v brew &>/dev/null; then
        info "Installing Docker Desktop via Homebrew..."
        brew install --cask docker
        info "Launching Docker Desktop..."
        open -a Docker
        info "Waiting for Docker Desktop to start (up to 60 seconds)..."
        local i=0
        while ! docker_running && [ $i -lt 60 ]; do
            sleep 2; i=$((i+2)); printf "."
        done
        echo ""
        if docker_running; then
            success "Docker Desktop is running."
        else
            error "Docker Desktop did not start in time. Open it manually and re-run this script."
            exit 1
        fi
    else
        warn "Homebrew not found. Opening Docker Desktop download page..."
        open "https://www.docker.com/products/docker-desktop/" 2>/dev/null || \
            info "Download Docker Desktop from: https://www.docker.com/products/docker-desktop/"
        echo ""
        echo "  1. Download and install Docker Desktop"
        echo "  2. Start Docker Desktop from Applications"
        echo "  3. Re-run this script: ./start.sh"
        echo ""
        exit 0
    fi
}

install_docker_windows() {
    warn "Automatic Docker installation is not supported on Windows."
    echo ""
    echo "  Please install Docker Desktop manually:"
    echo "  → https://www.docker.com/products/docker-desktop/"
    echo ""
    echo "  Then re-run this script in Git Bash or WSL."
    exit 1
}

ensure_docker() {
    if docker_installed && docker_running; then
        return 0
    fi

    if docker_installed && ! docker_running; then
        warn "Docker is installed but not running."
        case "$OS" in
            Darwin)
                info "Starting Docker Desktop..."
                open -a Docker 2>/dev/null || true
                info "Waiting for Docker to start..."
                local i=0
                while ! docker_running && [ $i -lt 60 ]; do
                    sleep 2; i=$((i+2)); printf "."
                done
                echo ""
                if ! docker_running; then
                    error "Docker did not start. Please open Docker Desktop manually."
                    exit 1
                fi
                ;;
            Linux)
                sudo systemctl start docker 2>/dev/null || true
                sleep 3
                if ! docker_running; then
                    error "Could not start Docker. Try: sudo systemctl start docker"
                    exit 1
                fi
                ;;
        esac
        return 0
    fi

    banner "Docker not found — installing automatically"
    case "$OS" in
        Linux)   install_docker_linux ;;
        Darwin)  install_docker_mac ;;
        MINGW*|CYGWIN*|MSYS*) install_docker_windows ;;
        *)
            error "Unsupported OS: $OS. Please install Docker manually: https://docker.com"
            exit 1
            ;;
    esac
}

# ── Build image from source ────────────────────────────────────────────────
# Builds Floci (from https://github.com/floci-io/floci) + the React UI
# into a single image. Pass FRESH=1 to force a fresh Floci clone.
cmd_build() {
    local fresh="${1:-0}"
    banner "Building Floci UI from source"
    info "  → Floci source: https://github.com/floci-io/floci"
    info "  → UI source:    $(basename "$SCRIPT_DIR")"
    echo ""
    warn "First build takes 5-10 minutes (downloading Maven dependencies)."
    warn "Subsequent builds are much faster thanks to Docker layer cache."
    echo ""

    local build_args=()
    if [ "$fresh" = "1" ]; then
        info "Forcing fresh Floci source clone..."
        build_args+=(--build-arg "CACHEBUST=$(date +%s)")
    fi

    docker build "${build_args[@]}" -t "$IMAGE" "$SCRIPT_DIR"
    success "Build complete."
}

# ── Sub-commands ───────────────────────────────────────────────────────────
cmd_stop() {
    info "Stopping Floci UI..."
    docker stop "$CONTAINER" 2>/dev/null && success "Stopped." || warn "Container was not running."
    docker rm "$CONTAINER" 2>/dev/null || true
}

cmd_logs() {
    docker logs -f "$CONTAINER"
}

cmd_status() {
    if docker ps --filter "name=^${CONTAINER}$" --format '{{.Status}}' | grep -q .; then
        local status
        status="$(docker ps --filter "name=^${CONTAINER}$" --format '{{.Status}}')"
        success "Running — $status"
        echo "  → UI:  http://localhost:${UI_PORT}"
        echo "  → API: http://localhost:${API_PORT}"
    else
        warn "Not running. Start with: ./start.sh"
    fi
}

cmd_update() {
    banner "Updating to latest Floci source"
    ensure_docker
    cmd_build "1"   # fresh=1 → re-clones Floci from GitHub
    cmd_stop 2>/dev/null || true
    cmd_run
}

cmd_run() {
    # Remove stale container
    docker rm -f "$CONTAINER" 2>/dev/null || true

    info "Starting container..."
    docker run -d \
        --name "$CONTAINER" \
        --restart unless-stopped \
        -p "${UI_PORT}:3000" \
        -p "${API_PORT}:4566" \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -v floci-ui-data:/app/data \
        -u root \
        -e FLOCI_DEFAULT_REGION=us-east-1 \
        -e FLOCI_SERVICES_DOCKER_NETWORK=floci-net \
        "$IMAGE" > /dev/null

    # Wait for Floci health (JVM starts in ~30-60s)
    info "Waiting for services to be ready (JVM startup, please wait)..."
    local i=0
    while [ $i -lt 120 ]; do
        if docker exec "$CONTAINER" curl -sf http://localhost:4566/_floci/health &>/dev/null 2>&1; then
            break
        fi
        sleep 1; i=$((i+1)); printf "."
    done
    echo ""

    echo ""
    echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════╗${RESET}"
    echo -e "${GREEN}${BOLD}║   Floci UI is ready!                     ║${RESET}"
    echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════╣${RESET}"
    echo -e "${GREEN}${BOLD}║${RESET}  Dashboard  → ${CYAN}http://localhost:${UI_PORT}${RESET}      ${GREEN}${BOLD}║${RESET}"
    echo -e "${GREEN}${BOLD}║${RESET}  AWS API    → ${CYAN}http://localhost:${API_PORT}${RESET}     ${GREEN}${BOLD}║${RESET}"
    echo -e "${GREEN}${BOLD}║${RESET}  47 AWS services  ·  us-east-1          ${GREEN}${BOLD}║${RESET}"
    echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════╝${RESET}"
    echo ""
    echo "  Stop:   ./start.sh stop"
    echo "  Logs:   ./start.sh logs"
    echo "  Update: ./start.sh update   ← rebuilds with latest Floci source"
    echo ""

    # Auto-open browser
    case "$OS" in
        Darwin) sleep 1 && open "http://localhost:${UI_PORT}" &;;
        Linux)
            sleep 1
            xdg-open "http://localhost:${UI_PORT}" 2>/dev/null || \
            sensible-browser "http://localhost:${UI_PORT}" 2>/dev/null || true
            ;;
    esac
}

cmd_start() {
    ensure_docker

    # Build from source if the image doesn't exist yet
    if ! docker image inspect "$IMAGE" &>/dev/null; then
        cmd_build "0"
    fi

    cmd_run
}

# ── Main ───────────────────────────────────────────────────────────────────
case "${1:-start}" in
    start)  cmd_start  ;;
    stop)   cmd_stop   ;;
    logs)   cmd_logs   ;;
    status) cmd_status ;;
    update) cmd_update ;;
    build)  ensure_docker && cmd_build "0" ;;
    *)
        echo "Usage: $0 {start|stop|logs|status|update|build}"
        exit 1
        ;;
esac
