#!/bin/sh
# Fix Docker socket group ownership so the 'floci' user can reach it,
# then exec the CMD (supervisord).
set -eu

if [ -S /var/run/docker.sock ]; then
    sock_gid="$(stat -c '%g' /var/run/docker.sock)"
    if [ "$sock_gid" != '0' ]; then
        group_name="$(getent group "$sock_gid" | cut -d: -f1 2>/dev/null)" || group_name=''
        if [ -z "$group_name" ]; then
            groupadd -g "$sock_gid" docker-host 2>/dev/null || true
            group_name='docker-host'
        fi
        usermod -aG "$group_name" floci 2>/dev/null || true
    fi
fi

# Ensure data dir is writable by floci
if [ -d /app/data ]; then
    chown -R floci:root /app/data 2>/dev/null || true
fi

exec "$@"
