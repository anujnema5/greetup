FROM oven/bun:1.3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-pip build-essential && rm -rf /var/lib/apt/lists/*
RUN pip3 install invoke --break-system-packages

COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/client/package.json ./apps/client/
COPY apps/server/package.json ./apps/server/
COPY apps/matching-service/package.json ./apps/matching-service/
COPY apps/rtc-service/package.json ./apps/rtc-service/
COPY apps/voiceiq-service/package.json ./apps/voiceiq-service/

RUN bun install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/rtc-service/tsconfig.json ./apps/rtc-service/
COPY apps/rtc-service/src ./apps/rtc-service/src
COPY apps/rtc-service/package.json ./apps/rtc-service/

WORKDIR /app/apps/rtc-service

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5370

EXPOSE 5370

CMD ["bun", "run", "start"]
