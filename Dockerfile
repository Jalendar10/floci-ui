# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build the React UI
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS ui-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Combined image — Floci emulator + nginx UI in one container
# ─────────────────────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

# Install nginx, supervisor, and minimal tooling
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx supervisor procps curl \
    && rm -rf /var/lib/apt/lists/*

# ── Copy Floci native binary + helpers from the official image ────────────
COPY --from=floci/floci:latest /app/application                 /app/application
COPY --from=floci/floci:latest /app/quarkus-artifact.properties /app/quarkus-artifact.properties
COPY --from=floci/floci:latest /usr/local/bin/gosu              /usr/local/bin/gosu
COPY --from=floci/floci:latest /usr/local/bin/localstack-parity.sh /usr/local/bin/localstack-parity.sh
RUN chmod +x /app/application /usr/local/bin/gosu

# Create floci user (uid 1001, same as upstream image)
RUN useradd -r -u 1001 -g root -M -d /app floci \
    && mkdir -p /app/data \
    && chown -R floci:root /app

# ── Copy built React UI → nginx html root ────────────────────────────────
COPY --from=ui-builder /app/dist /usr/share/nginx/html

# ── nginx: serve UI on :3000, proxy /floci/* → Floci on :4566 ───────────
COPY nginx-combined.conf /etc/nginx/sites-available/default
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default \
    && rm -f /etc/nginx/sites-enabled/default.bak

# ── supervisord: manages both nginx and floci ────────────────────────────
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ── Entrypoint: fix Docker socket group, then exec supervisord ───────────
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Floci AWS API (optional, for CLI access)  |  UI dashboard
EXPOSE 4566 3000

VOLUME ["/app/data"]

HEALTHCHECK --interval=10s --timeout=5s --start-period=15s \
    CMD curl -sf http://localhost:4566/_floci/health && curl -sf http://localhost:3000/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
