FROM node:lts-alpine

# NODE_ENV se define en runtime (después del build) para que pnpm instale
# también las devDependencies durante la fase de compilación (prisma, tsc, etc.)

WORKDIR /usr/src/app

# 1. Instalar pnpm globalmente
RUN npm install -g pnpm@9

# 2. Copiar archivos de dependencias (incluyendo el lock de pnpm)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma/

# 3. Instalar dependencias ignorando scripts de post-install problemáticos
RUN pnpm install --frozen-lockfile --ignore-scripts

# 4. Genera el client de Prisma
RUN pnpm run db:generate

# 5. Copia el resto del código fuente
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json ./

# 6. Compila TypeScript
RUN pnpm run build

# 7. Elimina devDependencies para que la imagen pese menos
RUN pnpm prune --production

# 8. A partir de aquí solo correrá código compilado — marcar entorno como producción
ENV NODE_ENV=production

# 9. Carpetas necesarias en runtime
RUN mkdir -p uploads logs

EXPOSE 3000

RUN chown -R node:node /usr/src/app

USER node

CMD ["node", "dist/app.js"]