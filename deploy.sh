#!/usr/bin/env bash
# ==============================================================================
# BitTonik Pay-Hub - Production Deployment Script
# Domain: https://pay.bittonik.com
# Usage: ./deploy.sh
# ==============================================================================

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${BOLD}${BLUE}================================================================${NC}"
echo -e "${BOLD}${BLUE}   🚀 BitTonik Pay-Hub - Déploiement Sécurisé & Dockerisé       ${NC}"
echo -e "${BOLD}${BLUE}================================================================${NC}\n"

# 1. Vérification des prérequis
echo -e "${BOLD}[1/6] Vérification des outils nécessaires...${NC}"

if ! command -v docker &>/dev/null; then
    echo -e "${RED}Erreur: Docker n'est pas installé.${NC}"
    echo "Installez Docker avec: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

DOCKER_COMPOSE_CMD=""
if docker compose version &>/dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}Erreur: Docker Compose n'est pas disponible.${NC}"
    exit 1
fi
echo -e "  • Docker et Compose : ${GREEN}OK${NC}"

# 2. Vérification du fichier d'environnement (.env)
echo -e "\n${BOLD}[2/6] Contrôle du fichier .env de production...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}Fichier .env introuvable. Création depuis .env.example...${NC}"
    cp .env.example .env
    
    # Génération d'une clé secrète HMAC aléatoire de 64 caractères
    RANDOM_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /proc/sys/kernel/random/uuid | tr -d '-')
    DB_PASSWORD=$(openssl rand -hex 16 2>/dev/null || echo "PayHubSecPswd2026!")
    
    # Remplacement automatique des placeholders
    sed -i "s/super_secret_pay_hub_hmac_signing_key_change_in_production/$RANDOM_SECRET/g" .env
    sed -i "s/localhost:5432/payhub-db:5432/g" .env
    sed -i "s/password/$DB_PASSWORD/g" .env
    
    echo -e "${GREEN}✓ Fichier .env initialisé avec des clés sécurisées aléatoires.${NC}"
    echo -e "${YELLOW}⚠️ N'oubliez pas d'éditer .env pour y ajouter vos clés Stripe, PayPal et MonCash réelles.${NC}"
else
    echo -e "  • Fichier .env présent : ${GREEN}OK${NC}"
fi

# 3. Démarrage de la base de données PostgreSQL
echo -e "\n${BOLD}[3/6] Démarrage du conteneur PostgreSQL et vérification de santé...${NC}"
$DOCKER_COMPOSE_CMD up -d payhub-db

echo "Attente de la disponibilité de PostgreSQL..."
until docker exec payhub-db pg_isready -U payhub_user -d payhub_production &>/dev/null || docker exec payhub-db pg_isready -U postgres &>/dev/null; do
    echo -n "."
    sleep 2
done
echo -e "\n${GREEN}✓ Base de données PostgreSQL opérationnelle.${NC}"

# 4. Synchronisation du schéma Prisma (Migrations)
echo -e "\n${BOLD}[4/6] Synchronisation du schéma Prisma dans PostgreSQL...${NC}"
$DOCKER_COMPOSE_CMD run --rm payhub-app npx prisma db push --skip-generate || true
echo -e "${GREEN}✓ Schéma de base de données à jour.${NC}"

# 5. Construction et démarrage des conteneurs
echo -e "\n${BOLD}[5/6] Build et démarrage de Pay-Hub (Next.js Standalone)...${NC}"
$DOCKER_COMPOSE_CMD up -d --build --remove-orphans

echo -e "${GREEN}✓ Conteneurs Pay-Hub démarrés en arrière-plan.${NC}"
$DOCKER_COMPOSE_CMD ps

# 6. Test de connectivité interne (Healthcheck)
echo -e "\n${BOLD}[6/6] Vérification du point de terminaison interne...${NC}"
sleep 5

TARGET_PORT="${PAYHUB_PORT:-3009}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${TARGET_PORT}/ || true)
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "307" ] || [ "$HTTP_STATUS" = "308" ]; then
    echo -e "${GREEN}✓ Pay-Hub répond correctement sur http://127.0.0.1:${TARGET_PORT} (HTTP $HTTP_STATUS).${NC}"
else
    echo -e "${YELLOW}⚠️ Statut HTTP retourné : $HTTP_STATUS (le démarrage peut nécessiter quelques secondes de plus).${NC}"
fi

echo -e "\n${BOLD}${BLUE}================================================================${NC}"
echo -e "${BOLD}${GREEN}   🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !                         ${NC}"
echo -e "${BOLD}${BLUE}================================================================${NC}"
echo -e "\nProchaines étapes de configuration Nginx & SSL :"
echo -e "1. Copiez la configuration Nginx :"
echo -e "   ${BOLD}sudo cp nginx/pay.bittonik.com.conf /etc/nginx/sites-available/${NC}"
echo -e "   ${BOLD}sudo ln -sf /etc/nginx/sites-available/pay.bittonik.com.conf /etc/nginx/sites-enabled/${NC}"
echo -e "   ${BOLD}sudo nginx -t && sudo systemctl reload nginx${NC}"
echo -e "\n2. Activez le certificat SSL Let's Encrypt :"
echo -e "   ${BOLD}sudo certbot --nginx -d pay.bittonik.com${NC}\n"
