# Use official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the frontend code
COPY . .

# Expose port 3000 for React development server
EXPOSE 3000

# Command to run React development server
CMD ["npm", "start"]