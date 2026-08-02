FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tini
COPY --from=dependencies /app/node_modules ./node_modules
COPY package*.json server.js ./
COPY src ./src
RUN mkdir -p logs && chown -R node:node /app
USER node
EXPOSE 5001
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
