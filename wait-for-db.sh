#!/bin/sh
# Attendre que MySQL soit prêt
until nc -z -v -w30 db 4002
do
  echo "En attente de MySQL..."
  sleep 2
done
echo "MySQL est prêt, démarrage du backend !"
npm run start
