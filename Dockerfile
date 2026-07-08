FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommands git python3 make g++ openssh-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package