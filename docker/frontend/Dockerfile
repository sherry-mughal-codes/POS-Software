FROM node:20-alpine

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY frontend/package.json frontend/package-lock.json* ./

# Install dependencies
RUN npm install

# Copy application files
COPY frontend/ .

EXPOSE 5173

# Run Vite dev server bound to 0.0.0.0 for container networking
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
