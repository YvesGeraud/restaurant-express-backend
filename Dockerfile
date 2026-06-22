FROM node:lts-alpine

ENV NODE_ENV=production

WORKDIR /usr/src/app

# 1. Instalar pnpm globalmente
RUN npm install -g pnpm

# 2. Copiar archivos de dependencias (incluyendo el lock de pnpm)
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# 3. Instalar dependencias ignorando scripts de post-install problemáticos
RUN pnpm install --frozen-lockfile --ignore-scripts

# 4. Genera el client de Prisma
RUN npx prisma generate

# 5. Copia el resto del código fuente
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json ./

# 6. Compila TypeScript
RUN pnpm run build

# 7. Elimina devDependencies para que la imagen pese menos
RUN pnpm prune --production

# 8. Carpetas necesarias en runtime
RUN mkdir -p uploads logs

EXPOSE 3000

RUN chown -R node:node /usr/src/app

USER node

CMD ["node", "dist/app.js"]