# Hostinger Deployment Guide for Buizz Backend

This guide will help you deploy both your server and admin backends to Hostinger with subdomains:
- **Server API**: `api.buizz.com`
- **Admin API**: `admin.buizz.com`

## Prerequisites

- Hostinger account (VPS or Cloud hosting)
- Domain `buizz.com` configured in Hostinger
- SSH access to your Hostinger server
- Basic knowledge of Linux commands
- Node.js and npm installed locally

## Step 1: Access Your Hostinger Server

### 1.1 Get SSH Credentials
1. Log in to your Hostinger hPanel
2. Go to **VPS** or **Cloud** section
3. Find your server and click **Manage**
4. Copy the **SSH IP**, **Username**, and **Password**

### 1.2 Connect via SSH
```bash
# On your local machine
ssh username@your-server-ip

# Enter password when prompted
```

Or use SSH key:
```bash
ssh -i /path/to/your-key.pem username@your-server-ip
```

## Step 2: Configure Subdomains

### 2.1 Add Subdomains in Hostinger
1. In hPanel, go to **Domains** → **Subdomains**
2. Add subdomain: `api.buizz.com`
3. Add subdomain: `admin.buizz.com`
4. Point both to your server IP

### 2.2 Verify DNS Propagation
```bash
# Check if subdomains are pointing to your server
nslookup api.buizz.com
nslookup admin.buizz.com
```

## Step 3: Install Required Software

### 3.1 Update System
```bash
sudo apt update
sudo apt upgrade -y
```

### 3.2 Install Node.js (v18 or higher)
```bash
# Install Node.js using NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 3.3 Install MySQL
```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Start MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 3.4 Install Redis
```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 3.5 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 3.6 Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3.7 Install Git
```bash
sudo apt install -y git
```

## Step 4: Setup Database

### 4.1 Use Hostinger MySQL Database

**Note:** If you're using Hostinger's managed MySQL databases, skip the manual database creation. Use the provided credentials:

**Hostinger Database Credentials:**
- **Server Database:** `u943298757_buizz_mgmt`
- **Admin Database:** `u943298757_buizzadmin`
- **MySQL User:** `u943298757_buizzadmin`
- **Website:** `buizz.com`
- **Created:** 2026-06-08

**If using Hostinger managed MySQL:**
1. Log in to Hostinger hPanel
2. Go to **Databases** → **MySQL Databases**
3. Note the database host (usually `localhost` or a specific host)
4. Use the provided credentials in your `.env` files

**If creating databases manually on VPS:**
```bash
sudo mysql
```

```sql
-- Create databases
CREATE DATABASE buizz_management;
CREATE DATABASE buizz_admin;

-- Create user (replace with strong password)
CREATE USER 'buizz_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON buizz_management.* TO 'buizz_user'@'localhost';
GRANT ALL PRIVILEGES ON buizz_admin.* TO 'buizz_user'@'localhost';

-- Flush privileges and exit
FLUSH PRIVILEGES;
EXIT;
```

### 4.2 Import Database Schema
```bash
# Copy your schema files to server
# Or import from your local machine
scp d:\buizz_management_system\server\database\schema_complete.sql username@server-ip:/tmp/

# On server, import schema
mysql -u buizz_user -p buizz_management < /tmp/schema_complete.sql
```

## Step 5: Deploy Server Backend (api.buizz.com)

### 5.1 Clone Repository
```bash
# Navigate to your web directory
cd /var/www/

# Clone your repository (replace with your actual repo)
sudo git clone https://github.com/Nikitabasaiye/buizz-management-system.git buizz-server

# Or upload files using SFTP/FTP
```

### 5.2 Navigate to Server Directory
```bash
cd /var/www/buizz-server/server
```

### 5.3 Install Dependencies
```bash
npm install --production
```

### 5.4 Create Environment File
```bash
sudo nano .env
```

Add the following configuration:
```env
# Server Configuration
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_USER=u943298757_buizzadmin
DB_PASSWORD=your_hostinger_db_password_here
DB_NAME=u943298757_buizz_mgmt
DB_PORT=3306

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_change_this
JWT_EXPIRE=7d

# Frontend Configuration
FRONTEND_URL=https://www.buizz.com
BACKEND_URL=https://api.buizz.com

# Meta WhatsApp Business API Configuration
META_WHATSAPP_API_URL=https://graph.facebook.com/v23.0
META_WHATSAPP_ACCESS_TOKEN=1223979700792824
META_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
META_WHATSAPP_BUSINESS_ACCOUNT_ID=149210734931509
META_WEBHOOK_VERIFY_TOKEN=buizz_webhook_token_2024
META_APP_SECRET=your_meta_app_secret_here

# WhatsApp Public URL
WHATSAPP_PUBLIC_BASE_URL=https://api.buizz.com

# PhonePe Payment Configuration
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_SALT_KEY=your_salt_key
PHONEPE_SALT_INDEX=1
PHONEPE_ENVIRONMENT=PRODUCTION
PHONEPE_CALLBACK_URL=https://api.buizz.com/api/v1/payments/phonepe/callback

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@buizz.com

# File Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=.jpg,.jpeg,.png,.pdf

# AWS S3 Configuration (if using)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your_bucket_name

# Logging
LOG_LEVEL=info
```

### 5.5 Create Storage Directories
```bash
sudo mkdir -p /var/www/buizz-server/server/storage/pdfs
sudo mkdir -p /var/www/buizz-server/server/storage/qrcodes
sudo mkdir -p /var/www/buizz-server/server/storage/kyc-documents
sudo mkdir -p /var/www/buizz-server/server/logs

# Set permissions
sudo chown -R $USER:$USER /var/www/buizz-server/server/storage
sudo chmod -R 755 /var/www/buizz-server/server/storage
```

### 5.6 Start Server with PM2
```bash
# Start the server
pm2 start server.js --name "buizz-server"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### 5.7 Check Server Status
```bash
pm2 status
pm2 logs buizz-server
```

## Step 6: Deploy Admin Backend (admin.buizz.com)

### 6.1 Navigate to Admin Directory
```bash
cd /var/www/buizz-server/admin
```

### 6.2 Install Dependencies
```bash
npm install --production
```

### 6.3 Create Environment File
```bash
sudo nano .env
```

Add the following configuration:
```env
# Admin Server Configuration
NODE_ENV=production
ADMIN_PORT=5001
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_USER=u943298757_buizzadmin
DB_PASSWORD=your_hostinger_db_password_here
DB_NAME=u943298757_buizz_mgmt
DB_PORT=3306

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here_change_this
JWT_EXPIRE=7d
ADMIN_JWT_SECRET=your_admin_jwt_secret_key_here_change_this
ADMIN_JWT_EXPIRE=24h

# Frontend Configuration
ADMIN_FRONTEND_URL=https://admin.buizz.com
BACKEND_URL=https://api.buizz.com

# Meta WhatsApp Business API Configuration
META_WHATSAPP_API_URL=https://graph.facebook.com/v23.0
META_WHATSAPP_ACCESS_TOKEN=1223979700792824
META_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
META_WHATSAPP_BUSINESS_ACCOUNT_ID=149210734931509
META_WEBHOOK_VERIFY_TOKEN=buizz_webhook_token_2024
META_APP_SECRET=your_meta_app_secret_here

# WhatsApp Public URL
WHATSAPP_PUBLIC_BASE_URL=https://api.buizz.com

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@buizz.com

# File Upload Configuration
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=.jpg,.jpeg,.png,.pdf

# AWS S3 Configuration (if using)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your_bucket_name

# Logging
LOG_LEVEL=info
```

### 6.4 Create Storage Directories
```bash
sudo mkdir -p /var/www/buizz-server/admin/storage/pdfs
sudo mkdir -p /var/www/buizz-server/admin/logs

# Set permissions
sudo chown -R $USER:$USER /var/www/buizz-server/admin/storage
sudo chmod -R 755 /var/www/buizz-server/admin/storage
```

### 6.5 Start Admin Server with PM2
```bash
# Start the admin server
pm2 start server.js --name "buizz-admin"

# Save PM2 configuration
pm2 save
```

### 6.6 Check Admin Server Status
```bash
pm2 status
pm2 logs buizz-admin
```

## Step 7: Configure Nginx Reverse Proxy

### 7.1 Create Nginx Configuration for Server API
```bash
sudo nano /etc/nginx/sites-available/api.buizz.com
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name api.buizz.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.buizz.com;

    # SSL Configuration (will be updated with Let's Encrypt)
    ssl_certificate /etc/ssl/certs/api.buizz.com.crt;
    ssl_certificate_key /etc/ssl/private/api.buizz.com.key;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/api.buizz.com.access.log;
    error_log /var/log/nginx/api.buizz.com.error.log;

    # Reverse Proxy to Node.js Server
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Serve static files (QR codes, PDFs)
    location /storage/ {
        alias /var/www/buizz-server/server/storage/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 7.2 Create Nginx Configuration for Admin API
```bash
sudo nano /etc/nginx/sites-available/admin.buizz.com
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name admin.buizz.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.buizz.com;

    # SSL Configuration (will be updated with Let's Encrypt)
    ssl_certificate /etc/ssl/certs/admin.buizz.com.crt;
    ssl_certificate_key /etc/ssl/private/admin.buizz.com.key;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/admin.buizz.com.access.log;
    error_log /var/log/nginx/admin.buizz.com.error.log;

    # Reverse Proxy to Node.js Admin Server
    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Serve static files (PDFs)
    location /storage/ {
        alias /var/www/buizz-server/admin/storage/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 7.3 Enable Sites
```bash
# Create symbolic links
sudo ln -s /etc/nginx/sites-available/api.buizz.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.buizz.com /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Step 8: Setup SSL with Let's Encrypt

### 8.1 Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 Obtain SSL Certificates
```bash
# For api.buizz.com
sudo certbot --nginx -d api.buizz.com

# For admin.buizz.com
sudo certbot --nginx -d admin.buizz.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 8.3 Setup Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot automatically sets up cron job for renewal
# Verify cron job exists
sudo systemctl list-timers | grep certbot
```

## Step 9: Configure Firewall

### 9.1 Configure UFW Firewall
```bash
# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 10: Setup Deployment Script (Optional)

### 10.1 Create Deployment Script
```bash
nano /var/www/buizz-server/deploy.sh
```

Add the following:
```bash
#!/bin/bash

# Navigate to project directory
cd /var/www/buizz-server

# Pull latest changes
git pull origin development

# Update server dependencies
cd server
npm install --production

# Update admin dependencies
cd ../admin
npm install --production

# Restart PM2 processes
pm2 restart buizz-server
pm2 restart buizz-admin

echo "Deployment completed successfully!"
```

### 10.2 Make Script Executable
```bash
chmod +x /var/www/buizz-server/deploy.sh
```

## Step 11: Test Deployment

### 11.1 Test Server API
```bash
# Test health endpoint
curl https://api.buizz.com/health

# Test API endpoint
curl https://api.buizz.com/api/v1
```

### 11.2 Test Admin API
```bash
# Test health endpoint
curl https://admin.buizz.com/health

# Test API endpoint
curl https://admin.buizz.com/api/v1
```

### 11.3 Check PM2 Status
```bash
pm2 status
pm2 logs
```

### 11.4 Check Nginx Logs
```bash
# Server API logs
sudo tail -f /var/log/nginx/api.buizz.com.access.log
sudo tail -f /var/log/nginx/api.buizz.com.error.log

# Admin API logs
sudo tail -f /var/log/nginx/admin.buizz.com.access.log
sudo tail -f /var/log/nginx/admin.buizz.com.error.log
```

## Step 12: Monitor and Maintain

### 12.1 Monitor PM2 Processes
```bash
# Monitor in real-time
pm2 monit

# View logs
pm2 logs buizz-server
pm2 logs buizz-admin
```

### 12.2 Restart Services if Needed
```bash
# Restart server
pm2 restart buizz-server

# Restart admin
pm2 restart buizz-admin

# Restart all
pm2 restart all
```

### 12.3 Update Application
```bash
cd /var/www/buizz-server
git pull origin development
cd server && npm install --production
cd ../admin && npm install --production
pm2 restart all
```

## Troubleshooting

### Server Not Starting
```bash
# Check PM2 logs
pm2 logs buizz-server

# Check if port is in use
sudo netstat -tlnp | grep :5000

# Check Node.js version
node --version
```

### Database Connection Issues
```bash
# Check MySQL status
sudo systemctl status mysql

# Test MySQL connection with Hostinger credentials
mysql -u u943298757_buizzadmin -p u943298757_buizz_mgmt
```

### Nginx Issues
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx
```

### SSL Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew
```

### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER /var/www/buizz-server
sudo chmod -R 755 /var/www/buizz-server
```

## Security Best Practices

1. **Use Strong Passwords**: Change all default passwords
2. **Keep Software Updated**: Regularly run `sudo apt update && sudo apt upgrade`
3. **Use SSH Keys**: Disable password authentication for SSH
4. **Configure Firewall**: Only allow necessary ports
5. **Monitor Logs**: Regularly check application and server logs
6. **Backup Database**: Set up automated database backups
7. **Use Environment Variables**: Never commit sensitive data to git

## Backup Strategy

### Database Backup
```bash
# Create backup script
nano /var/www/backup-db.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u u943298757_buizzadmin -p'your_hostinger_db_password' u943298757_buizz_mgmt > /var/backups/buizz_mgmt_$DATE.sql
mysqldump -u u943298757_buizzadmin -p'your_hostinger_db_password' u943298757_buizzadmin > /var/backups/buizz_admin_$DATE.sql

# Keep only last 7 days of backups
find /var/backups -name "buizz_*.sql" -mtime +7 -delete
```

```bash
# Make executable and add to cron
chmod +x /var/www/backup-db.sh
crontab -e

# Add daily backup at 2 AM
0 2 * * * /var/www/backup-db.sh
```

## Summary

After completing these steps, you will have:
- ✅ Server API running at `https://api.buizz.com`
- ✅ Admin API running at `https://admin.buizz.com`
- ✅ SSL certificates with auto-renewal
- ✅ PM2 process management
- ✅ Nginx reverse proxy
- ✅ MySQL and Redis configured
- ✅ Automated backups (if configured)

Your Meta WhatsApp webhooks can now be configured with:
- **Callback URL**: `https://api.buizz.com/api/webhooks/whatsapp`
- **Verify Token**: `buizz_webhook_token_2024`
