FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tini
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js worker.js ./
COPY cron ./cron
COPY scripts ./scripts
COPY src ./src
RUN mkdir -p logs storage && chown -R node:node /app
USER node
EXPOSE 5000 9090
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
