#!/bin/bash

PUID=${PUID:-1000}
PGID=${PGID:-1000}

# Create user if it doesn't exist
useradd appuser || true

# Update user and group IDs
groupmod -o -g "$PGID" appuser
usermod -o -u "$PUID" appuser

# Set ownership of directories BEFORE switching user
chown -R appuser:appuser $DATA_DIRECTORY
chown -R appuser: appuser $VIDEO_DIRECTORY
chown -R appuser:appuser $PROCESSED_DIRECTORY

echo '-------------------------------------'
echo "User uid:     $(id -u appuser)"
echo "User gid:    $(id -g appuser)"
echo '-------------------------------------'

# Remove any lockfiles on startup (as appuser)
runuser -u appuser -- rm -f $DATA_DIRECTORY/*. lock 2> /dev/null

# Remove job db on start (as appuser)
runuser -u appuser -- rm -f /jobs.sqlite

# Start nginx as appuser (not root!)
runuser -u appuser -- nginx -g 'daemon on;'

# Ensure PATH and LD_LIBRARY_PATH are set
export PATH=/usr/local/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/nvidia/lib:/usr/local/nvidia/lib64:/usr/local/lib:/usr/local/cuda/lib64:${LD_LIBRARY_PATH}

# Run migrations as appuser
runuser -u appuser -- env PATH="$PATH" LD_LIBRARY_PATH="$LD_LIBRARY_PATH" flask db upgrade

# Run gunicorn with environment variables preserved
exec runuser -u appuser -- env PATH="$PATH" LD_LIBRARY_PATH="$LD_LIBRARY_PATH" \
    gunicorn --bind=127.0.0.1:5000 "fireshare: create_app(init_schedule=True)" \
    --workers 3 --threads 3 --preload
