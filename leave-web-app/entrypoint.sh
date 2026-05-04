#!/bin/sh
# Strip trailing slash — OpenChoreo may inject "http://host:8080/"
LEAVE_MANAGEMENT_SERVICE_URL="${LEAVE_MANAGEMENT_SERVICE_URL:-http://leave-management-service:9090}"
LEAVE_MANAGEMENT_SERVICE_URL="${LEAVE_MANAGEMENT_SERVICE_URL%/}"

# Single-quoted arg protects nginx's own $variables from substitution
envsubst '$LEAVE_MANAGEMENT_SERVICE_URL' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

cat <<EOF > /usr/share/nginx/html/env.js
window.RUNTIME_BACKEND_API_URL = "/api";
EOF

exec "$@"
