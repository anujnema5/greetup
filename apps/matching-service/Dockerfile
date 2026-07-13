FROM oven/bun:1.3.11-alpine

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY apps/client/package.json ./apps/client/
COPY apps/server/package.json ./apps/server/
COPY apps/matching-service/package.json ./apps/matching-service/
COPY apps/rtc-service/package.json ./apps/rtc-service/
COPY apps/voiceiq-service/package.json ./apps/voiceiq-service/

# Workspace install pulls mediasoup (rtc-service); skip its native worker on alpine.
RUN MEDIASOUP_WORKER_BIN=/dev/null bun install --frozen-lockfile --production

COPY packages/shared ./packages/shared
COPY apps/matching-service/tsconfig.json ./apps/matching-service/
COPY apps/matching-service/src ./apps/matching-service/src
COPY apps/matching-service/package.json ./apps/matching-service/

WORKDIR /app/apps/matching-service

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5060

EXPOSE 5060

CMD ["bun", "run", "start"]
