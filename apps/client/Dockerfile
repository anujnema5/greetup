FROM oven/bun:1.3.11-alpine AS deps

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
RUN MEDIASOUP_WORKER_BIN=/dev/null bun install --frozen-lockfile

FROM deps AS build

COPY packages/shared ./packages/shared
COPY packages/tsconfig ./packages/tsconfig
COPY apps/client ./apps/client

WORKDIR /app/apps/client

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SOCKET_SERVER_URL
ARG NEXT_PUBLIC_RTC_SOCKET_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SOCKET_SERVER_URL=$NEXT_PUBLIC_SOCKET_SERVER_URL
ENV NEXT_PUBLIC_RTC_SOCKET_URL=$NEXT_PUBLIC_RTC_SOCKET_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID

RUN bun run build

FROM oven/bun:1.3.11-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/client/node_modules ./apps/client/node_modules
COPY --from=deps /app/packages ./packages
COPY --from=build /app/apps/client/.next ./apps/client/.next
COPY --from=build /app/apps/client/public ./apps/client/public
COPY --from=build /app/apps/client/package.json ./apps/client/package.json
COPY --from=build /app/apps/client/next.config.ts ./apps/client/next.config.ts
COPY --from=build /app/apps/client/site-domain.ts ./apps/client/site-domain.ts
COPY --from=deps /app/package.json ./package.json

WORKDIR /app/apps/client

EXPOSE 3000

CMD ["bun", "run", "start"]
