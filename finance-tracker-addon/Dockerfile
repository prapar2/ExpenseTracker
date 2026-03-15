ARG BUILD_FROM="ghcr.io/home-assistant/amd64-base:latest"
FROM $BUILD_FROM

RUN apk add --no-cache nodejs npm sqlite python3 make g++

WORKDIR /app

# These paths work because GitHub Actions builds from repo root
COPY finance-tracker/package.json ./
COPY finance-tracker/client ./client
COPY finance-tracker/server ./server

RUN npm install && npm run build

COPY finance-tracker-addon/run.sh /run.sh
RUN chmod a+x /run.sh

CMD ["/run.sh"]
