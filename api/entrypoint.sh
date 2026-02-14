#!/bin/sh
# Fix ownership of mounted volume (Railway mounts as root)
chown -R appuser:appuser /app/uploads
# Drop to appuser and run the server
exec su-exec appuser ./server
