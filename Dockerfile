# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Clone and build Floci from source (always gets latest code)
# ─────────────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:25-jdk AS floci-builder

RUN apt-get update && apt-get install -y --no-install-recommends git maven \
    && rm -rf /var/lib/apt/lists/*

# CACHEBUST forces a fresh clone when passed as --build-arg (used by update cmd)
ARG CACHEBUST=1
RUN git clone --depth 1 https://github.com/floci-io/floci.git /floci

WORKDIR /floci
RUN mvn dependency:go-offline -q
RUN mvn clean package -DskipTests -q

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Build the React UI
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS ui-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Runtime — Floci (JVM) + nginx UI in one container
# ─────────────────────────────────────────────────────────────────────────────
FROM eclipse-temurin:25-jre

# Install nginx, supervisor, and minimal tooling
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx supervisor procps curl wget \
    && rm -rf /var/lib/apt/lists/*

# Install gosu (same version and checksums as the official Floci image)
ENV GOSU_VERSION=1.17
RUN set -eux; \
    dpkgArch="$(dpkg --print-architecture | awk -F- '{print $NF}')"; \
    case "$dpkgArch" in \
        amd64) gosuSha256='bbc4136d03ab138b1ad66fa4fc051bafc6cc7ffae632b069a53657279a450de3' ;; \
        arm64) gosuSha256='c3805a85d17f4454c23d7059bcb97e1ec1af272b90126e79ed002342de08389b' ;; \
        *) echo >&2 "unsupported arch: $dpkgArch"; exit 1 ;; \
    esac; \
    wget -q -O /usr/local/bin/gosu \
        "https://github.com/tianon/gosu/releases/download/${GOSU_VERSION}/gosu-${dpkgArch}"; \
    echo "${gosuSha256}  /usr/local/bin/gosu" | sha256sum -c -; \
    chmod +x /usr/local/bin/gosu; \
    gosu nobody true

# Create floci user (uid 1001, matching upstream image)
RUN useradd -r -u 1001 -g root -M -d /app -s /sbin/nologin floci \
    && mkdir -p /app/data /app/quarkus-app \
    && chown -R floci:root /app

# ── Copy Floci JARs built from source ────────────────────────────────────────
COPY --from=floci-builder /floci/target/quarkus-app/ /app/quarkus-app/
RUN chown -R floci:root /app/quarkus-app

# ── Copy built React UI → nginx html root ────────────────────────────────────
COPY --from=ui-builder /app/dist /usr/share/nginx/html

# ── nginx: serve UI on :3000, proxy /floci/* → Floci on :4566 ───────────────
COPY nginx-combined.conf /etc/nginx/sites-available/default
RUN ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

# ── supervisord: manages both nginx and floci ────────────────────────────────
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ── Entrypoint: fix Docker socket group, then exec supervisord ───────────────
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Floci AWS API (optional, for CLI access)  |  UI dashboard
EXPOSE 4566 3000

VOLUME ["/app/data"]

# JVM startup is slower than native — allow 90s before health checks fail
HEALTHCHECK --interval=10s --timeout=5s --start-period=90s \
    CMD curl -sf http://localhost:4566/_floci/health && curl -sf http://localhost:3000/ || exit 1

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
