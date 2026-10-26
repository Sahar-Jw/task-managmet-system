# Stage 1: build the static site (Next.js "output: export" -> /app/out)
FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# These are baked into the JavaScript at build time. Pass them with
# --build-arg; changing them later requires rebuilding the image.
ARG NEXT_PUBLIC_API_URL=https://api.dcc.sy/api/v1
ARG NEXT_PUBLIC_API_ORIGIN=https://api.dcc.sy
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_ORIGIN=$NEXT_PUBLIC_API_ORIGIN

RUN npm run build

# Stage 2: serve the static files with nginx (no Node needed at runtime)
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html

EXPOSE 80
