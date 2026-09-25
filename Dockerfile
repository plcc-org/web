# Builds the site and serves it the way Cloudflare does, for Apple's `container`
# CLI (or Docker) — see docs/infrastructure.md.
#
# Served by `astro preview`, not a static web server: the Cloudflare adapter's
# preview runs the built Worker in workerd, so short links (_redirects), the
# security headers (_headers), the 410 routes and the 404 page behave exactly as
# deployed, with nothing translated into a second server's config to drift.
#
# Node 22 to match .node-version, which CI and Cloudflare both read.
FROM node:22
WORKDIR /app
COPY package.json package-lock.json ./
COPY patches ./patches
# `npm ci`, not `npm install`: the lockfile is what CI and Cloudflare install, and
# a drifted tree can make the post-build Tina lock check fail.
RUN npm ci
COPY . .
ARG DEPLOY_ENV=staging
ENV DEPLOY_ENV=${DEPLOY_ENV}
RUN npm run build
EXPOSE 8080
# --ignore-lock keeps the server in the foreground, where the container needs it.
CMD ["npx", "astro", "preview", "--host", "0.0.0.0", "--port", "8080", "--ignore-lock"]
