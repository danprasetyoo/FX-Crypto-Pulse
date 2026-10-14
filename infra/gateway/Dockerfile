FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d /etc/nginx/templates
# nginx image menjalankan envsubst pada /etc/nginx/templates/*.template -> /etc/nginx/conf.d/
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
