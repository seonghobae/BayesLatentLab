FROM node:18-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    g++ \
    make \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install CmdStan
WORKDIR /opt
RUN wget https://github.com/stan-dev/cmdstan/releases/download/v2.33.1/cmdstan-2.33.1.tar.gz \
    && tar -xzf cmdstan-2.33.1.tar.gz \
    && rm cmdstan-2.33.1.tar.gz \
    && cd cmdstan-2.33.1 \
    && make build -j4

ENV CMDSTAN=/opt/cmdstan-2.33.1

# Set up application
WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Expose port for API (future)
EXPOSE 3000

CMD ["npm", "run", "dev"]
