#!/bin/bash
# Em caso de está usando o Windows, use, por exemplo, o Git Bash para executar o script:
# ./bootstrap.sh

echo "Instalando dependências..."
npm install

echo "Iniciando containers..."
docker-compose up -d

echo "Aguardando containers..."
sleep 7

echo "Executando migrations..."
node ace migration:run

echo "Inserindo dados de teste..."
node ace db:seed

echo "Iniciando servidor..."
npm run dev
