$ docker compose up -d                                                                                                                                                                                              02:19
WARN[0000] The "POSTGRES_USER" variable is not set. Defaulting to a blank string. 
WARN[0000] The "POSTGRES_PASSWORD" variable is not set. Defaulting to a blank string. 
WARN[0000] The "POSTGRES_DB" variable is not set. Defaulting to a blank string. 
WARN[0000] The "POSTGRES_USER" variable is not set. Defaulting to a blank string. 
WARN[0000] The "POSTGRES_DB" variable is not set. Defaulting to a blank string. 
WARN[0000] The "POSTGRES_DB" variable is not set. Defaulting to a blank string. 
WARN[0000] The "POSTGRES_USER" variable is not set. Defaulting to a blank string. 
WARN[0000] The "POSTGRES_PASSWORD" variable is not set. Defaulting to a blank string. 
[+] Building 24.0s (21/25)                                                                                                                                                                                                
 => [internal] load local bake definitions                                                                                                                                                                           0.0s
 => => reading from stdin 973B                                                                                                                                                                                       0.0s
 => [backend internal] load build definition from Dockerfile                                                                                                                                                         0.0s
 => => transferring dockerfile: 309B                                                                                                                                                                                 0.0s
 => [frontend internal] load build definition from Dockerfile                                                                                                                                                        0.1s
 => => transferring dockerfile: 384B                                                                                                                                                                                 0.0s
 => [backend internal] load metadata for docker.io/library/golang:1.25                                                                                                                                               1.2s
 => [frontend internal] load metadata for docker.io/oven/bun:1                                                                                                                                                       1.0s
 => [frontend internal] load .dockerignore                                                                                                                                                                           0.0s
 => => transferring context: 34B                                                                                                                                                                                     0.0s
 => [frontend internal] load build context                                                                                                                                                                           0.1s
 => => transferring context: 3.08kB                                                                                                                                                                                  0.0s
 => [frontend base 1/2] FROM docker.io/oven/bun:1@sha256:f20d9cf365ab35529384f1717687c739c92e6f39157a35a95ef06f4049a10e4a                                                                                            0.1s
 => => resolve docker.io/oven/bun:1@sha256:f20d9cf365ab35529384f1717687c739c92e6f39157a35a95ef06f4049a10e4a                                                                                                          0.1s
 => CACHED [frontend base 2/2] WORKDIR /frontend                                                                                                                                                                     0.0s
 => CACHED [frontend deps 1/2] COPY package.json bun.lock* ./                                                                                                                                                        0.0s
 => CACHED [frontend deps 2/2] RUN bun install --frozen-lockfile                                                                                                                                                     0.0s
 => CACHED [frontend builder 1/3] COPY --from=deps /frontend/node_modules ./node_modules                                                                                                                             0.0s
 => CACHED [frontend builder 2/3] COPY . .                                                                                                                                                                           0.0s
 => ERROR [frontend builder 3/3] RUN bun run build                                                                                                                                                                  21.4s
 => [backend internal] load .dockerignore                                                                                                                                                                            0.0s
 => => transferring context: 454B                                                                                                                                                                                    0.0s
 => [backend internal] load build context                                                                                                                                                                            0.0s
 => => transferring context: 320B                                                                                                                                                                                    0.0s
 => [backend 1/7] FROM docker.io/library/golang:1.25@sha256:bc45dfd319e982dffe4de14428c77defe5b938e29d9bc6edfbc0b9a1fc171cb3                                                                                         0.1s
 => => resolve docker.io/library/golang:1.25@sha256:bc45dfd319e982dffe4de14428c77defe5b938e29d9bc6edfbc0b9a1fc171cb3                                                                                                 0.1s
 => CACHED [backend 2/7] WORKDIR /backend                                                                                                                                                                            0.0s
 => CACHED [backend 3/7] COPY go.mod go.sum ./                                                                                                                                                                       0.0s
 => CACHED [backend 4/7] RUN go mod download                                                                                                                                                                         0.0s
 => CANCELED [backend 5/7] RUN go install github.com/pressly/goose/v3/cmd/goose@latest                                                                                                                              22.3s
------
 > [frontend builder 3/3] RUN bun run build:
0.559 $ next build
5.186 Attention: Next.js now collects completely anonymous telemetry regarding usage.
5.186 This information is used to shape Next.js' roadmap and prioritize features.
5.186 You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
5.186 https://nextjs.org/telemetry
5.218    ▲ Next.js 16.0.6 (Turbopack)
5.218 
5.349    Creating an optimized production build ...
11.14  ✓ Compiled successfully in 4.3s
11.14    Running TypeScript ...
16.57 Failed to compile.
16.57 
16.57 ./providers/lms-provider.tsx:20:35
16.57 Type error: Argument of type '{ name: string; email: string; avatar: string; avatarColor: string; }' is not assignable to parameter of type 'User | (() => User)'.
16.57   Type '{ name: string; email: string; avatar: string; avatarColor: string; }' is missing the following properties from type 'User': id, role
16.57 
16.57   18 |
16.57   19 |     // Initialize with your mock config data
16.57 > 20 |     const [user] = useState<User>(lmsConfig.user)
16.57      |                                   ^
16.57   21 |
16.57   22 |     // This would eventually be fetched from your Go backend
16.57   23 |     const [classes] = useState<Class[]>([
16.78 Next.js build worker exited with code: 1 and signal: null
16.99 error: script "build" exited with code 1
------
Dockerfile:11

--------------------

   9 |     COPY --from=deps /frontend/node_modules ./node_modules

  10 |     COPY . .

  11 | >>> RUN bun run build

  12 |     

  13 |     FROM base AS runner

--------------------

target frontend: failed to solve: process "/bin/sh -c bun run build" did not complete successfully: exit code: 1
