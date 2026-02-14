FROM node:18-alpine

WORKDIR /app

# Instalar dependências do sistema necessárias para o Prisma e outras libs nativas
RUN apk add --no-cache openssl

# Copiar apenas os arquivos de dependência do servidor primeiro para aproveitar o cache
COPY server/package*.json ./server/
COPY server/prisma ./server/prisma/

WORKDIR /app/server

# Instalar dependências
RUN npm install

# Gerar o cliente Prisma
RUN npx prisma generate

# Copiar o restante do código fonte do servidor
COPY server/ .

# Compilar o TypeScript
RUN npm run build

# Expor a porta da aplicação
EXPOSE 3000

# Definir variáveis de ambiente padrão (podem ser sobrescritas pelo docker-compose)
ENV PORT=3000
ENV NODE_ENV=production

# Comando de inicialização
CMD ["npm", "start"]
