FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node test ./test
COPY --chown=node:node docker ./docker
USER node
EXPOSE 4000
CMD ["npm", "start"]
