ARG BUILD_FROM="ghcr.io/home-assistant/amd64-base:latest"
FROM $BUILD_FROM

RUN apk add --no-cache nodejs npm sqlite python3 make g++

WORKDIR /app

COPY finance-tracker/package.json ./
COPY finance-tracker/client ./client
COPY finance-tracker/server ./server

RUN npm install && npm run build

# Register as s6 service — copy run.sh into s6 services directory
COPY finance-tracker-addon/run.sh /etc/services.d/finance_tracker/run
RUN chmod a+x /etc/services.d/finance_tracker/run

# No CMD — HA base image handles startup via s6
