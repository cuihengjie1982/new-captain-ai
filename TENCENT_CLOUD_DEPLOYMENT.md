# 🚀 腾讯云轻量服务器部署指南

## 📋 部署前准备

### 1. 服务器配置要求
- **服务器类型**: 腾讯云轻量应用服务器
- **操作系统**: Ubuntu 20.04 LTS 或以上
- **内存**: 至少 2GB
- **存储**: 至少 20GB
- **带宽**: 推荐 5Mbps以上

### 2. 已配置的API凭证
✅ **DeepSeek API**: `sk-5eeca5c4321b4562bb3a58ae77751721`
✅ **通义千问API**: `sk-be0085afc5fd46c293ffb040b7cac8d9`
✅ **通义听悟AppKey**: `eNnot8DLOV3RpOut`
✅ **通义听悟Token**: `5180bec184894b2a8cf7878b92d62ce3`

## 🏗️ 腾讯云服务器配置

### 1. 连接服务器
```bash
# 使用SSH连接
ssh root@your_server_ip

# 更新系统
apt update && apt upgrade -y
```

### 2. 安装必要软件
```bash
# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 安装npm
npm install -g npm

# 安装Nginx
apt install -y nginx

# 安装PM2（进程管理）
npm install -g pm2

# 验证安装
node --version
npm --version
nginx -v
```

### 3. 配置防火墙
```bash
# 开放必要端口
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

## 📦 项目部署

### 1. 上传项目文件
```bash
# 方式1: 使用scp上传
scp -r /Users/tree/Desktop/captainai.cc/captainai.cc root@your_server_ip:/root/

# 方式2: 使用Git克隆（如果有Git仓库）
# git clone your-repo-url
```

### 2. 进入项目目录并安装依赖
```bash
cd /root/captainai.cc

# 安装依赖
npm install

# 或使用淘宝镜像加速
npm install --registry=https://registry.npmmirror.com
```

### 3. 构建生产版本
```bash
# 构建生产版本
npm run build

# 或使用构建脚本
chmod +x build-for-production.sh
./build-for-production.sh
```

## 🔧 配置Nginx

### 1. 创建Nginx配置文件
```bash
nano /etc/nginx/sites-available/captainai.cc
```

添加以下内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名

    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;  # 替换为您的域名

    # SSL证书配置
    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    # 或者使用Let's Encrypt（推荐）
    # ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 根目录
    root /root/captainai.cc/dist;
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API代理（如果有后端API）
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

### 2. 启用配置
```bash
# 创建软链接
ln -s /etc/nginx/sites-available/captainai.cc /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
systemctl enable nginx
```

## 🚀 启动应用

### 1. 使用PM2启动
```bash
# 启动应用
pm2 start npm --name "captain-ai" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs captain-ai

# 设置开机自启
pm2 startup
pm2 save
```

### 2. 创建PM2配置文件
```bash
nano ecosystem.config.js
```

添加以下内容：
```javascript
module.exports = {
  apps: [{
    name: 'captain-ai',
    script: 'npm',
    args: 'start',
    instances: 1,  // 生产环境可以增加实例数
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '1G',
    watch: false,
    ignore_watch: ['node_modules', 'dist'],
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## 🛡️ SSL证书配置

### 方案1: 使用Let's Encrypt（推荐）
```bash
# 安装Certbot
apt install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com

# 自动续期
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### 方案2: 使用自签名证书（临时）
```bash
# 生成证书
mkdir -p /etc/ssl/private
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/your-key.pem \
  -out /etc/ssl/certs/your-cert.pem

# 配置Nginx使用自签名证书
```

## 📊 监控和维护

### 1. 监控脚本
```bash
# 创建监控脚本
nano /root/monitor.sh
```

```bash
#!/bin/bash
# 检查Nginx状态
if ! systemctl is-active --quiet nginx; then
    echo "Nginx is down, restarting..."
    systemctl restart nginx
fi

# 检查应用状态
if ! pm2 list | grep captain-ai | grep online; then
    echo "Captain AI is down, restarting..."
    pm2 restart captain-ai
fi

# 记录日志
echo "$(date): Monitoring check completed" >> /var/log/monitor.log
```

```bash
chmod +x /root/monitor.sh

# 添加定时任务
echo "*/5 * * * * /root/monitor.sh" | crontab -
```

### 2. 备份脚本
```bash
# 创建备份脚本
nano /root/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份配置文件
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    /root/captainai.cc/.env.production \
    /etc/nginx/sites-available/captainai.cc \
    /root/.pm2

# 备份应用文件
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /root/captainai.cc/dist

# 清理30天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x /root/backup.sh

# 添加每日备份任务
echo "0 2 * * * /root/backup.sh" | crontab -
```

## 🧪 部署验证

### 1. 功能测试
```bash
# 检查网站访问
curl -I http://your-domain.com

# 检查HTTPS
curl -I https://your-domain.com

# 检查API连接
curl -I https://your-domain.com/api
```

### 2. 性能测试
```bash
# 安装测试工具
npm install -g artillery

# 创建性能测试配置
cat > artillery-test.yml << EOF
config:
  target: 'https://your-domain.com'
  phases:
    - duration: 60
      arrivalRate: 5
scenarios:
  - name: "Homepage"
    weight: 100
    flow:
      - get:
          url: "/"
```

# 运行性能测试
artillery run artillery-test.yml
```

## 🔧 常见问题解决

### 1. 端口冲突
```bash
# 查看端口占用
netstat -tlnp | grep :80
netstat -tlnp | grep :443

# 杀死占用端口的进程
sudo fuser -k 80/tcp
```

### 2. 内存不足
```bash
# 检查内存使用
free -h

# 创建Swap文件
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 3. Nginx配置错误
```bash
# 检查配置语法
nginx -t

# 查看错误日志
tail -f /var/log/nginx/error.log
```

### 4. 应用启动失败
```bash
# 查看PM2日志
pm2 logs captain-ai --lines 100

# 重启应用
pm2 restart captain-ai
```

## 📞 技术支持

### 域名和SSL
- 域名解析到服务器IP
- SSL证书配置和续期

### 服务器维护
- 系统更新和补丁
- 安全加固
- 性能优化

### 应用问题
- 查看控制台错误信息
- 检查API调用日志
- 监控系统资源使用

---

## 🎉 部署完成！

您的AI视频转写系统现在运行在腾讯云轻量服务器上：

- ✅ **真实语音识别** - 阿里云通义听悟
- ✅ **AI智能分析** - DeepSeek API
- ✅ **HTTPS安全访问** - SSL证书
- ✅ **自动重启** - PM2进程管理
- ✅ **监控和备份** - 完整的维护方案

现在访问您的域名，即可开始使用完整的AI视频转写功能！