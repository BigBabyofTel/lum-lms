FROM docker.io/oven/bun:1 AS base
WORKDIR /usr/src/app

# Install stage for dependency caching
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

                                # Final stage
FROM base AS final
COPY --from=install /temp/dev/node_modules /usr/src/app/node_modules
COPY . .
RUN chown -R bun:bun /usr/src/app
ENTRYPOINT ["bun", "run", "dev"]