#!/bin/bash
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 20

cd /home/ubuntu/app_files
git fetch origin
git reset --hard origin/main
npm install
pkill -f node || true
sleep 2
nohup npm run build -- --host > /home/ubuntu/app.log 2>&1 &
echo "Deploy completado: $(date)"