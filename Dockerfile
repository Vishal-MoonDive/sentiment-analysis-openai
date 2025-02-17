# Use Node.js for building the Next.js app
FROM node:18 AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files into the container
COPY . .

# Build the Next.js application
RUN npm run build

# Use NGINX for serving the app
FROM nginx:latest

# Copy the built Next.js app to NGINX's default HTML directory
COPY --from=builder /app/out /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
