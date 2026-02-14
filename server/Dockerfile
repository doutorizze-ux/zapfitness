FROM node:20-alpine

WORKDIR /app

# Instalar dependências de sistema
RUN apk add --no-cache openssl

# Copiar arquivos de dependência
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm install

# Gerar cliente Prisma
RUN npx prisma generate

# Copiar código fonte
COPY . .

# Build
RUN npm run build

# Expor porta
EXPOSE 3000

# Variáveis de ambiente
ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "start"]
