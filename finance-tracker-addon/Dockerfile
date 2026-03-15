ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js LTS, npm, and sqlite3 CLI
RUN apk add --no-cache nodejs npm sqlite

# Set working directory
WORKDIR /app

# Copy package.json from the finance-tracker subfolder
# (build context = repo root, so path starts with finance-tracker/)
COPY finance-tracker/package.json ./

# Copy application source
COPY finance-tracker/client ./client
COPY finance-tracker/server ./server

# Install all dependencies and build the React frontend
RUN npm install && npm run build

# Copy the HA-specific startup script into the container
COPY finance-tracker-addon/run.sh /run.sh
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]