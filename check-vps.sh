#!/usr/bin/env bash
# ==============================================================================
# BitTonik Pay-Hub - VPS Environment & Ports Diagnostic Tool
# Execute this script directly on bentz@vmi2717052
# ==============================================================================

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${BOLD}${BLUE}================================================================${NC}"
echo -e "${BOLD}${BLUE}   🔍 BitTonik Pay-Hub - Diagnostic Pré-Déploiement VPS         ${NC}"
echo -e "${BOLD}${BLUE}================================================================${NC}\n"

# 1. Host & OS Info
echo -e "${BOLD}[1/5] Informations Système & Machine :${NC}"
echo -e "  • Hôte : $(hostname) ($(whoami))"
if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo -e "  • Système : $PRETTY_NAME"
fi
echo -e "  • Uptime : $(uptime -p 2>/dev/null || uptime)"

# 2. Resources (RAM, CPU, Disk)
echo -e "\n${BOLD}[2/5] Ressources Disponibles :${NC}"
echo -e "  • Mémoire RAM :"
free -h | awk 'NR<=2{print "    " $0}'
echo -e "  • Espace Disque :"
df -h / | awk 'NR<=2{print "    " $0}'

# 3. Docker & Docker Compose
echo -e "\n${BOLD}[3/5] Détection de Docker & Docker Compose :${NC}"
if command -v docker &>/dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "  • Docker : ${GREEN}Installé${NC} ($DOCKER_VERSION)"
else
    echo -e "  • Docker : ${RED}NON INSTALLÉ${NC} (Requis pour conteneuriser Pay-Hub)"
fi

if docker compose version &>/dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    echo -e "  • Docker Compose : ${GREEN}Installé${NC} ($COMPOSE_VERSION)"
elif command -v docker-compose &>/dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo -e "  • Docker Compose : ${GREEN}Installé (v1)${NC} ($COMPOSE_VERSION)"
else
    echo -e "  • Docker Compose : ${RED}NON INSTALLÉ${NC}"
fi

# 4. Web Server (Nginx / Apache / Caddy)
echo -e "\n${BOLD}[4/5] Serveur Web Reverse Proxy :${NC}"
if command -v nginx &>/dev/null; then
    NGINX_VERSION=$(nginx -v 2>&1)
    echo -e "  • Nginx : ${GREEN}Installé${NC} ($NGINX_VERSION)"
    if systemctl is-active --quiet nginx; then
        echo -e "  • Service Nginx : ${GREEN}En cours d'exécution (Actif)${NC}"
    else
        echo -e "  • Service Nginx : ${YELLOW}Inactif / Arrêté${NC}"
    fi
else
    echo -e "  • Nginx : ${YELLOW}Non installé${NC} (Sera installé pour SSL et reverse proxy)"
fi

if command -v certbot &>/dev/null; then
    echo -e "  • Certbot (Let's Encrypt) : ${GREEN}Installé${NC}"
else
    echo -e "  • Certbot (Let's Encrypt) : ${YELLOW}Non installé${NC}"
fi

# 5. Ports Analysis (80, 443, 3000, 5432)
echo -e "\n${BOLD}[5/5] Audit des Ports Réseau :${NC}"

check_port() {
    local port=$1
    local name=$2
    local process=""

    if command -v ss &>/dev/null; then
        process=$(ss -tulpn 2>/dev/null | grep ":$port " || true)
    elif command -v netstat &>/dev/null; then
        process=$(netstat -tulpn 2>/dev/null | grep ":$port " || true)
    elif command -v lsof &>/dev/null; then
        process=$(lsof -i :$port 2>/dev/null || true)
    fi

    if [ -n "$process" ]; then
        echo -e "  • Port ${BOLD}$port${NC} ($name) : ${YELLOW}OCCUPÉ${NC}"
        echo -e "    $process" | head -n 1 | awk '{print "    └─ Processus : " $0}'
    else
        echo -e "  • Port ${BOLD}$port${NC} ($name) : ${GREEN}DISPONIBLE / LIBRE${NC}"
    fi
}

check_port 80 "HTTP Nginx"
check_port 443 "HTTPS Nginx / SSL"
check_port 3000 "Pay-Hub Next.js Container"
check_port 5432 "PostgreSQL Database"

echo -e "\n${BOLD}${BLUE}================================================================${NC}"
echo -e "${BOLD}${GREEN}   ✅ Diagnostic terminé avec succès !                          ${NC}"
echo -e "${BOLD}${BLUE}================================================================${NC}\n"
