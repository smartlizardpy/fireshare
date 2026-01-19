#!/bin/bash

echo "=== Fireshare Startup ==="

PUID=${PUID:-1000}
PGID=${PGID:-1000}

useradd appuser 2>/dev/null || true
groupmod -o -g "$PGID" appuser
usermod -o -u "$PUID" appuser

chown -R appuser: appuser $DATA_DIRECTORY
chown -R appuser:appuser $VIDEO_DIRECTORY
chown -R appuser:appuser $PROCESSED_DIRECTORY

echo "User uid:  $(id -u appuser)"
echo "User gid: $(id -g appuser)"

runuser -u appuser -- rm -f $DATA_DIRECTORY/*.lock 2> /dev/null || true
runuser -u appuser -- rm -f /jobs.sqlite 2> /dev/null || true

# Skip nginx for now to debug
echo "Skipping nginx, starting app directly..."

export PATH=/usr/local/bin: $PATH
export LD_LIBRARY_PATH=/usr/local/nvidia/lib:/usr/local/nvidia/lib64:/usr/local/lib:/usr/local/cuda/lib64:${LD_LIBRARY_PATH}

echo "Running database migrations..."
runuser -u appuser -- env PATH="$PATH" LD_LIBRARY_PATH="$LD_LIBRARY_PATH" flask db upgrade

echo "Starting gunicorn WITHOUT config file..."
exec runuser -u appuser -- env PATH="$PATH" LD_LIBRARY_PATH="$LD_LIBRARY_PATH" \
    gunicorn --bind=0.0.0.0:80 \
    --workers 3 \
    --threads 3 \
    --timeout 120 \
    --log-level debug \
    "fireshare: create_app(init_schedule=True)"
