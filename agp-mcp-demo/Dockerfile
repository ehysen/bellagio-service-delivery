# AGP MCP demo — container image. Portable across Render / Railway / Fly.io.
# We run TypeScript directly via tsx (no build step), so tsx is a runtime dep.
FROM node:22-slim

WORKDIR /app

# Install production deps first for layer caching. tsx is in "dependencies",
# so --omit=dev keeps the runtime but drops typescript/@types.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App source (node_modules, uploads, .git excluded via .dockerignore).
COPY . .

ENV NODE_ENV=production
# Default to the offline stub extractor so the image runs with zero secrets.
# Override AGP_EXTRACTOR / ANTHROPIC_API_KEY / AGP_BEARER_TOKEN in the host's env.
ENV AGP_EXTRACTOR=stub

# The platform injects PORT (Render/Railway/Fly); src/config.ts reads it.
# EXPOSE is documentation only — the app binds to $PORT (default 3000 locally).
EXPOSE 3000

CMD ["npm", "start"]
