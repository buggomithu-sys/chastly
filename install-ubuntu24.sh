#!/bin/bash
# Becastly Installation Script for Ubuntu 24.04
# Run as root: sudo bash install-ubuntu24.sh

set -e

REPO_URL="https://github.com/jaspritsinghghuman/becastly.git"
INSTALL_DIR="/opt/becastly"
DOMAIN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Get server IP
get_server_ip() {
    hostname -I | awk '{print $1}'
}

# Update system
update_system() {
    log "Updating system packages..."
    apt-get update
    apt-get upgrade -y
    success "System updated"
}

# Install Docker
install_docker() {
    log "Installing Docker..."
    
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Install dependencies
    apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        git
    
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Add Docker repository
    echo \
        "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start Docker
    systemctl start docker
    systemctl enable docker
    
    success "Docker installed"
}

# Install Docker Compose (standalone)
install_docker_compose() {
    log "Installing Docker Compose..."
    
    # Install docker-compose (v1) for compatibility
    curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Create symlink
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    success "Docker Compose installed"
}

# Clone repository
clone_repo() {
    log "Cloning Becastly repository..."
    
    if [ -d "$INSTALL_DIR" ]; then
        warn "Directory $INSTALL_DIR exists. Removing..."
        rm -rf "$INSTALL_DIR"
    fi
    
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    success "Repository cloned to $INSTALL_DIR"
}

# Create environment file
create_env() {
    log "Creating environment configuration..."
    
    cd "$INSTALL_DIR"
    
    # Generate encryption key
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-16)
    
    # Get server IP
    SERVER_IP=$(get_server_ip)
    
    cat > .env << EOF
# Database Configuration
POSTGRES_USER=becastly
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=becastly

# Application Configuration
ENCRYPTION_KEY=$ENCRYPTION_KEY
APP_URL=http://$SERVER_IP

# Frontend API URL (for browser requests)
NEXT_PUBLIC_API_URL=http://$SERVER_IP

# Redis Configuration
REDIS_URL=redis://redis:6379

# Optional: Email Configuration (SMTP)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
FROM_EMAIL=
FROM_NAME=Becastly

# Optional: Meta/WhatsApp Configuration
META_ACCESS_TOKEN=
META_PHONE_NUMBER_ID=

# Optional: Twilio Configuration
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Optional: Telegram Configuration
TELEGRAM_BOT_TOKEN=

# Node Environment
NODE_ENV=production
EOF

    # Create frontend production env
    cat > frontend/.env.production << EOF
NEXT_PUBLIC_API_URL=http://$SERVER_IP
EOF

    success "Environment configuration created"
    log "Database Password: $DB_PASSWORD"
    log "Encryption Key: $ENCRYPTION_KEY"
    log "Server IP: $SERVER_IP"
}

# Fix Docker Compose file
fix_docker_compose() {
    log "Fixing Docker Compose configuration..."
    
    cd "$INSTALL_DIR"
    
    # Remove localhost binding to allow nginx to connect
    sed -i 's/127.0.0.1:3001:3001/3001:3001/g' docker-compose.yml
    sed -i 's/127.0.0.1:3000:3000/3000:3000/g' docker-compose.yml
    
    success "Docker Compose fixed"
}

# Fix Frontend Dockerfile
fix_frontend_dockerfile() {
    log "Fixing Frontend Dockerfile..."
    
    cd "$INSTALL_DIR"
    
    cat > frontend/Dockerfile << 'DOCKERFILE'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
DOCKERFILE

    success "Frontend Dockerfile fixed"
}

# Create Nginx configuration
create_nginx_config() {
    log "Creating Nginx configuration..."
    
    cd "$INSTALL_DIR"
    
    mkdir -p nginx
    
    cat > nginx/nginx.conf << 'NGINX'
user nginx;
worker_processes auto;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;

    server {
        listen 80;
        server_name _;

        # API routes
        location /api/ {
            proxy_pass http://api:3001/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Auth API endpoints (POST only)
        location ~ ^/auth/(register|login|logout|me)$ {
            if ($request_method ~ ^(POST|PUT|DELETE|PATCH)$) {
                proxy_pass http://api:3001$request_uri;
            }
            proxy_pass http://frontend:3000$request_uri;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check
        location /health {
            proxy_pass http://api:3001/health;
        }

        # Webhooks
        location /webhooks/ {
            proxy_pass http://api:3001/webhooks/;
        }

        # Everything else goes to frontend
        location / {
            proxy_pass http://frontend:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
NGINX

    success "Nginx configuration created"
}

# Create public folder for frontend
create_public_folder() {
    log "Creating public folder..."
    mkdir -p "$INSTALL_DIR/frontend/public"
    touch "$INSTALL_DIR/frontend/public/.gitkeep"
    success "Public folder created"
}

# Build and start services
build_and_start() {
    log "Building and starting services..."
    
    cd "$INSTALL_DIR"
    
    # Pull images
    docker-compose pull
    
    # Build services
    docker-compose build --no-cache
    
    # Start services
    docker-compose up -d
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations
    log "Running database migrations..."
    docker-compose exec -T api npx prisma migrate dev --name init || true
    docker-compose exec -T api npx prisma migrate deploy || true
    
    # Restart API to apply changes
    docker-compose restart api
    
    success "Services built and started"
}

# Show status
show_status() {
    cd "$INSTALL_DIR"
    
    echo ""
    echo "========================================="
    echo "🎉 Becastly Installation Complete!"
    echo "========================================="
    echo ""
    echo "🌐 Access your app at:"
    echo "   http://$(get_server_ip)"
    echo "   http://$(get_server_ip)/auth/register"
    echo ""
    echo "📊 Service Status:"
    docker-compose ps
    echo ""
    echo "📁 Installation Directory: $INSTALL_DIR"
    echo ""
    echo "🔧 Useful Commands:"
    echo "   cd $INSTALL_DIR && docker-compose logs -f    # View logs"
    echo "   cd $INSTALL_DIR && docker-compose ps         # Check status"
    echo "   cd $INSTALL_DIR && docker-compose stop       # Stop services"
    echo "   cd $INSTALL_DIR && docker-compose start      # Start services"
    echo ""
    echo "⚙️  Configuration File: $INSTALL_DIR/.env"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Open http://$(get_server_ip)/auth/register in your browser"
    echo "   2. Create your admin account"
    echo "   3. Configure integrations in Settings"
    echo ""
}

# Main installation flow
main() {
    echo "========================================="
    echo "🚀 Becastly Installer for Ubuntu 24.04"
    echo "========================================="
    echo ""
    
    check_root
    update_system
    install_docker
    install_docker_compose
    clone_repo
    create_env
    fix_docker_compose
    fix_frontend_dockerfile
    create_nginx_config
    create_public_folder
    build_and_start
    show_status
}

# Run main function
main "$@"
