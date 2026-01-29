#!/bin/bash

# Couleurs pour le terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}1/4 - Nettoyage des anciens builds...${NC}"
rm -rf dist
rm -rf /tmp/final-deploy
mkdir -p /tmp/final-deploy/api

echo -e "${BLUE}2/4 - Création du Bundle (NCC)...${NC}"
# On utilise -t pour ignorer les erreurs de types et -m pour minifier
npx ncc build api/index.ts -o dist -m -t

if [ $? -ne 0 ]; then
    echo "Erreur lors du bundle. Vérifiez votre code."
    exit 1
fi

echo -e "${BLUE}3/4 - Préparation de l'environnement Vercel...${NC}"
cp dist/index.js /tmp/final-deploy/api/index.js
echo '{"name":"diomy-bundle","version":"1.0.0"}' > /tmp/final-deploy/package.json
echo '{"version":2,"routes":[{"src":"/api/(.*)","dest":"api/index.js"}]}' > /tmp/final-deploy/vercel.json

echo -e "${GREEN}4/4 - Déploiement sur Vercel en cours...${NC}"
cd /tmp/final-deploy
vercel deploy --prod --force --yes --token qTd0EkCFnrmGoYRNO0kPt4AI

echo -e "${GREEN}✅ TERMINÉ ! Votre API est à jour.${NC}"
