FROM oven/bun:1.3.11-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
ENV LISTEN_HOST=0.0.0.0
ENV PORT=5300

EXPOSE 5300

CMD ["bun", "run", "start"]
