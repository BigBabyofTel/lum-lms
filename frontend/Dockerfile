FROM oven/bun:1 AS base
WORKDIR /frontend

FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=deps /frontend/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS runner
COPY --from=builder /frontend/ ./
COPY package.json ./

EXPOSE 3001
CMD ["bun", "run", "dev"]
