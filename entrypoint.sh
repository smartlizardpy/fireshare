#!/bin/bash
set -e

echo "=== Fireshare Startup ==="

PUID=${PUID:-1000}
PGID=${PGID:-1000}

# Create user if it doesn't exist
useradd appuser 2>/dev/null || true

# Update user and group IDs
groupmod -o -g "$PGID" appuser
usermod -o -u "$PUID" appuser

# Set ownership of directories
chown -R appuser:appuser $DATA_DIRECTORY
chown -R appuser:appuser $VIDEO_DIRECTORY
chown -R appuser:appuser $PROCESSED_DIRECTORY

echo '-------------------------------------'
echo "User uid:      $(id -u appuser)"
echo "User gid:      $(id -g appuser)"
echo '-------------------------------------'

# Remove any lockfiles on startup
rm -f $DATA_DIRECTORY/*.lock 2>/dev/null || true
rm -f /jobs.sqlite 2>/dev/null || true

# Test nginx configuration first
echo "Testing nginx configuration..."
nginx -t
if [ $? -ne 0 ]; then
    echo "ERROR:  Nginx configuration test failed!"
    cat /etc/nginx/nginx.conf
    exit 1
fi

# Start nginx as ROOT (it will drop to nginx user automatically)
echo "Starting nginx..."
nginx -g 'daemon on;'
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to start nginx!"
    exit 1
fi
echo "Nginx started successfully"

# Ensure PATH and LD_LIBRARY_PATH are set
export PATH=/usr/local/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/nvidia/lib:/usr/local/nvidia/lib64:/usr/local/lib:/usr/local/cuda/lib64:${LD_LIBRARY_PATH}

# Run migrations - try different user-switching commands
echo "Running database migrations..."
if command -v gosu &> /dev/null; then
    gosu appuser env PATH="$PATH" LD_LIBRARY_PATH="$LD_LIBRARY_PATH" flask db upgrade
elif command -v su-exec &> /dev/null; then
    su-exec appuser env PATH="$PATH" LD_LIBRARY_PATH="$LD_LIBRARY_PATH" flask db upgrade
else
    echo "WARNING: No user-switching command found, running as root"
    flask db upgrade
fi

echo "Database migrations complete"

# Start gunicorn with config file if it exists, otherwise use command-line args
echo "Starting gunicorn..."
if command -v gosu &> /dev/null; then
    exec gosu appuser env PATH="$PATH" LD_LIBRARY_PATH="$LD_LIBRARY_PATH" \
        gunicorn --config /app/server/gunicorn.conf.py "fireshare:create_app(init_schedule=True)"
elif command -v su-exec &> /dev/null; then
    exec su-exec appuser env PATH="$PATH" LD_LIBRARY_PATH="$LD_LIBRARY_PATH" \
        gunicorn --config /app/server/gunicorn.conf.py "fireshare:create_app(init_schedule=True)"
else
    echo "WARNING: Running gunicorn as root, then dropping to appuser"
    exec env PATH="$PATH" LD_LIBRARY_PATH="$LD_LIBRARY_PATH" \
        gunicorn --config /app/server/gunicorn.conf. py \
        --user appuser --group appuser \
        "fireshare:create_app(init_schedule=True)"
fi
