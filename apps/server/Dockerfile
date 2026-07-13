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
# rtc-service image builds the worker properly on debian-slim.
RUN MEDIASOUP_WORKER_BIN=/dev/null bun install --frozen-lockfile --production

COPY packages/shared ./packages/shared
COPY apps/server/tsconfig.json ./apps/server/
COPY apps/server/src ./apps/server/src
COPY apps/server/package.json ./apps/server/

WORKDIR /app/apps/server

ENV NODE_ENV=production
ENV LISTEN_HOST=0.0.0.0
ENV PORT=5300

EXPOSE 5300

CMD ["bun", "run", "start"]
