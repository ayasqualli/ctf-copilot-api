FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommands git python3 make g++ openssh-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./ 
RUN npm install


FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommands git openssh-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]

