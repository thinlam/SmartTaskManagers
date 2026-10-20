# VoiceScribe backend + built web app, one container.
# Build context must be the repository root (npm workspaces + root lockfile):
#   docker build -f apps/voicescribe/Dockerfile .
# Railway: Root Directory "/", variable RAILWAY_DOCKERFILE_PATH=apps/voicescribe/Dockerfile.
# The Python diarization sidecar is NOT included; the API falls back to a single
# speaker label when it is unreachable.

FROM node:22-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/voicescribe/package.json apps/voicescribe/package.json
COPY apps/voicescribe/web/package.json apps/voicescribe/web/package.json
RUN npm ci --workspace=voicescribe --workspace=@voicescribe/web --include-workspace-root=false
COPY apps/voicescribe apps/voicescribe
RUN npm run build --workspace=@voicescribe/web

FROM node:22-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/voicescribe/package.json apps/voicescribe/package.json
COPY apps/voicescribe/web/package.json apps/voicescribe/web/package.json
RUN npm ci --workspace=voicescribe --include-workspace-root=false --omit=dev
COPY apps/voicescribe/src apps/voicescribe/src
COPY apps/voicescribe/tsconfig.json apps/voicescribe/tsconfig.json
COPY --from=build /repo/apps/voicescribe/web/dist apps/voicescribe/web/dist
WORKDIR /repo/apps/voicescribe
EXPOSE 3001
# Railway injects $PORT; env.ts reads it (default 3001).
CMD ["node", "--import", "tsx", "src/server.ts"]
