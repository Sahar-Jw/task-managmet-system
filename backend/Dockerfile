FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./

# Dev dependencies are kept on purpose: migrations/seed run with ts-node.
RUN npm install

COPY . .

RUN npm run build

# Windows checkouts may turn line endings into CRLF, which breaks the script.
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

ENV NODE_ENV=production

# Uploaded avatars/logos/attachments live here. Mount a persistent volume
# at /app/storage or they are lost on every redeploy.
VOLUME ["/app/storage"]

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
