FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Clean install with platform-specific binaries
RUN rm -rf node_modules package-lock.json && \
    npm install --legacy-peer-deps && \
    npm rebuild

# Copy the rest of your source
COPY . .

# Expose port for Vite
EXPOSE 5173

# Start Vite dev server
CMD ["npm", "run", "dev", "--", "--host"]