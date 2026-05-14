# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

RUN npx prisma generate

COPY . .

# Compile-only build (skips static prerender of /_global-error — Next 16 bug)
# Standalone output produces a self-contained server in .next/standalone/
RUN npx next build --experimental-build-mode compile

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init openssl

# Standalone bundle includes its own minimal node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma engine binaries
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/login', (r) => process.exit(r.statusCode < 500 ? 0 : 1))"

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "server.js"]
