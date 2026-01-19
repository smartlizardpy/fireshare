#!/bin/bash

echo "=== Fireshare Startup ==="

PUID=${PUID:-1000}
PGID=${PGID:-1000}

useradd appuser 2>/dev/null || true
groupmod -o -g "$PGID" appuser
usermod -o -u "$PUID" appuser

chown -R appuser:appuser $DATA_DIRECTORY
chown -R appuser:appuser $VIDEO_DIRECTORY
chown -R appuser:appuser $PROCESSED_DIRECTORY

echo "User uid:  $(id -u appuser)"
echo "User gid: $(id -g appuser)"

rm -f $DATA_DIRECTORY/*. lock 2>/dev/null || true
rm -f /jobs. sqlite 2>/dev/null || true

echo "Skipping nginx and user switching for debugging..."

export PATH=/usr/local/bin: $PATH
export LD_LIBRARY_PATH=/usr/local/nvidia/lib:/usr/local/nvidia/lib64:/usr/local/lib:/usr/local/cuda/lib64:${LD_LIBRARY_PATH}

echo "Running database migrations as root (for debugging)..."
flask db upgrade

echo "Starting gunicorn on port 5000 as root (for debugging)..."
echo "Python version: $(python3 --version)"
echo "Gunicorn version: $(gunicorn --version)"
echo "Testing import..."
python3 -c "from fireshare import create_app; print('Import successful'); app = create_app(init_schedule=True); print('App created successfully')"

echo "Actually starting gunicorn now..."
exec gunicorn --bind=0.0.0.0:5000 \
    --workers 3 \
    --threads 3 \
    --timeout 120 \
    --log-level debug \
    --access-logfile - \
    --error-logfile - \
    "fireshare: create_app(init_schedule=True)" 2>&1
