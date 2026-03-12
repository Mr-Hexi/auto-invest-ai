#!/bin/bash
# Gunicorn startup script for auto_invest_AI
# Used by PM2: pm2 start rungunicorn.sh --name autoinvest

cd /home/azureuser/auto_invest_AI/backend
source venv/bin/activate
gunicorn \
  --workers 2 \
  --timeout 120 \
  --bind unix:/home/azureuser/auto_invest_AI/backend/autoinvest.sock \
  auto_invest.wsgi:application
