#!/bin/bash
set -e  # Exit on any error

echo "=== Fireshare Startup ==="

PUID=${PUID:-1000}
PGID=${PGID:-1000}

# Create user if it doesn't exist
echo "Creating appuser..."
useradd appuser 2>/dev/null || true

# Update user and group IDs
echo "Setting UID/GID..."
groupmod -o -g "$PGID" appuser
usermod -o -u "$PUID" appuser

# Set ownership of directories
echo "Setting directory ownership..."
chown -R appuser:appuser $DATA_DIRECTORY
chown -R appuser:appuser $VIDEO_DIRECTORY
chown -R appuser:appuser $PROCESSED_DIRECTORY

echo '-------------------------------------'
echo "User uid:      $(id -u appuser)"
echo "User gid:      $(id -g appuser)"
echo '-------------------------------------'

# Remove any lockfiles on startup
echo "Cleaning up lock files..."
runuser -u appuser -- rm -f $DATA_DIRECTORY/*. lock 2> /dev/null || true

# Remove job db on start
echo "Cleaning up job database..."
runuser -u appuser -- rm -f /jobs. sqlite 2> /dev/null || true

# Test nginx configuration first
echo "Testing nginx configuration..."
nginx -t
if [ $?  -ne 0 ]; then
    echo "ERROR: Nginx configuration test failed!"
    exit 1
fi

# Start nginx as ROOT (needs to bind to port 80, then drops privileges)
echo "Starting nginx..."
nginx -g 'daemon on;'
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to start nginx!"
    exit 1
fi
echo "Nginx started successfully"

# Ensure PATH and LD_LIBRARY_PATH are set
export PATH=/usr/local/bin: $PATH
export LD_LIBRARY_PATH=/usr/local/nvidia/lib:/usr/local/nvidia/lib64:/usr/local/lib:/usr/local/cuda/lib64:${LD_LIBRARY_PATH}

# Run migrations as appuser
echo "Running database migrations..."
runuser -u appuser -- env PATH="$PATH" LD_LIBRARY_PATH="$LD_LIBRARY_PATH" flask db upgrade
if [ $? -ne 0 ]; then
    echo "ERROR:  Database migration failed!"
    exit 1
fi
echo "Database migrations complete"

# Run gunicorn with config file (or fall back to command line if no config file)
echo "Starting gunicorn..."
exec runuser -u appuser -- env PATH="$PATH" LD_LIBRARY_PATH="$LD_LIBRARY_PATH" \
    gunicorn --config /app/server/gunicorn.conf.py "fireshare:create_app(init_schedule=True)"
