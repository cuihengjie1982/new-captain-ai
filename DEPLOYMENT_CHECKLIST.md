# ✅ 腾讯云轻量服务器部署清单

## 📋 部署前检查清单

### 服务器准备
- [ ] 腾讯云轻量服务器已创建（Ubuntu 20.04+）
- [ ] 服务器规格：内存≥2GB，存储≥20GB，带宽≥5Mbps
- [ ] 域名已解析到服务器IP
- [ ] SSH连接正常：`ssh root@your_server_ip`

### 环境安装
- [ ] Node.js 18+ 已安装：`node --version`
- [ ] npm 已安装：`npm --version`
- [ ] Nginx 已安装：`nginx -v`
- [ ] PM2 已安装：`pm2 list`
- [ ] 防火墙已配置：`ufw status`

## 📦 项目文件清单

### 核心文件
- [ ] `package.json` - 项目依赖配置
- [ ] `tsconfig.json` - TypeScript配置
- [ ] `.env.production` - 生产环境变量 ✅
- [ ] `build-for-production.sh` - 构建脚本 ✅
- [ ] `src/` - 源代码目录
- [ ] `components/` - React组件
- [   ] `services/` - API服务
- [   ] `pages/` - 页面文件
- [   ] `types.ts` - 类型定义

### 部署文档
- [ ] `PRODUCTION_DEPLOYMENT.md` - 通用部署指南 ✅
- [ ] `TENCENT_CLOUD_DEPLOYMENT.md` - 腾讯云部署指南 ✅
- [ ] `README.md` - 项目说明文档
- [ ] `DEPLOYMENT_CHECKLIST.md` - 本部署清单 ✅

### 已清理的文件（无需上传）
- [x] `test-*.js` - 测试脚本已删除
- [x] `test-*.cjs` - 测试脚本已删除
- [x] `api-test.html` - 测试页面已删除
- [x] `debug-apis.js` - 调试脚本已删除
- [x] `*.temp.*` - 临时文件已删除
- [ ] `index.html` - 临时HTML文件已删除

## 🔧 生产配置验证

### 环境变量
```bash
# 检查 .env.production 文件
cat .env.production | grep -E "(TINGWU|DEEPSEEK|QWEN)"
```

**应该包含**:
```
VITE_TINGWU_APPKEY=eNnot8DLOV3RpOut
VITE_TINGWU_TOKEN=5180bec184894b2a8cf7878b92d62ce3
VITE_DEEPSEEK_API_KEY=sk-5eeca5c4321b4562bb3a58ae77751721
VITE_QWEN_API_KEY=sk-be0085afc5fd46c293ffb040b7cac8d9
```

### API凭证状态
- [ ] **通义听悟AppKey**: `eNnot8DLOV3RpOut` ✅
- [ ] **通义听悟Token**: `5180bec184894b2a8cf7878b92d62ce3` ✅
- [ ] **DeepSeek API**: `sk-5eeca5c4321b4562bb3a58ae77751721` ✅
- [ ] **通义千问API**: `sk-be0085afc5fd46c293ffb040b7cac8d9` ✅

## 🚀 部署步骤

### 1. 服务器连接和基础配置
```bash
# SSH连接
ssh root@your_server_ip

# 更新系统
apt update && apt upgrade -y

# 安装软件
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs nginx npm
npm install -g pm2

# 验证安装
node --version  # 应该显示 v18.x.x
npm --version    # 应该显示 npm 9.x.x
nginx -v         # 应该显示 nginx/1.x.x
```

### 2. 项目部署
```bash
# 上传项目（选择其中一种方式）
# 方式1: scp上传
# scp -r /Users/tree/Desktop/captainai.cc/captainai.cc root@your_server_ip:/root/

# 方式2: 压缩包上传
cd /Users/tree/Desktop/captainai.cc/captainai.cc
tar -czf captainai-deployment.tar.gz --exclude=node_modules --exclude=.git .
scp captainai-deployment.tar.gz root@your_server_ip:~/
ssh root@your_server_ip "tar -xzf captainai-deployment.tar.gz"

# 安装依赖
cd /root/captainai.cc
npm install

# 构建生产版本
npm run build
# 或
./build-for-production.sh
```

### 3. Nginx配置
```bash
# 创建配置文件
nano /etc/nginx/sites-available/captainai.cc

# 启用配置
ln -s /etc/nginx/sites-available/captainai.cc /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
systemctl enable nginx
```

### 4. 应用启动
```bash
# 启动应用
pm2 start npm --name "captain-ai" -- start

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs captain-ai
```

### 5. SSL证书（可选但推荐）
```bash
# 安装Certbot
apt install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com

# 设置自动续期
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## 🧪 部署后验证

### 基础功能
- [ ] 网站可通过HTTP访问：`http://your-domain.com`
- [ ] 网站可通过HTTPS访问：`https://your-domain.com`
- [ ] 前端页面正常显示
- [ ] 管理后台可访问：`https://your-domain.com/admin`
- [ ] 页面加载速度正常（<3秒）

### AI功能测试
- [ ] **AI全篇解析** - 使用DeepSeek API
- [ ] **视频转写功能** - 使用阿里云通义听悟 ✅
- [ ] **关键词提取** - 智能分析
- [ ] **导出功能** - 支持SRT/VTT/文本格式

### 性能测试
- [ ] 页面加载速度测试
- [ ] 并发用户处理测试
- [ ] 视频转写处理时间测试
- [ ] 内存使用监控

### 安全检查
- [ ] HTTPS证书正常有效
- [ ] 安全头部配置正确
- [ ] CORS配置适当
- [ ] 敏感信息不泄露

## 📊 监控设置

### 自动化监控
- [ ] 设置 `systemd` 自动重启服务
- [ ] 创建应用健康检查脚本
- [ ] 配置日志轮转
- [ ] 设置磁盘空间监控

### 备份策略
- [ ] 每日自动备份配置文件
- [ ] 每周完整项目备份
- [ ] 30天清理旧备份
- [ ] 备份存储在不同服务器

### 告警配置
- [ ] 服务宕机告警
- [ ] 内存使用率>80%告警
- [ ] 磁盘使用率>90%告警
- [ ] API错误率>5%告警

## 📞 故障排除参考

### 常见问题和解决方案
- **端口占用**：`netstat -tlnp | grep :80` → `sudo fuser -k 80/tcp`
- **内存不足**：创建Swap文件或升级服务器规格
- **Nginx配置错误**：`nginx -t` 检查语法，`tail -f /var/log/nginx/error.log` 查看日志
- **应用启动失败**：`pm2 logs captain-ai` 查看详细错误
- **API连接问题**：检查网络连接和API凭证有效性

### 联系支持
- 查看浏览器控制台错误：F12 → Console
- 检查网络请求状态：F12 → Network
- 查看服务器日志：`pm2 logs captainai-0`
- 检查Nginx日志：`tail -f /var/log/nginx/access.log`

---

## 🎉 部署完成确认

当以上所有项目都标记为完成时，您的AI视频转写系统已成功部署到腾讯云轻量服务器！

**现在您可以**：
- ✅ 访问您的域名使用完整功能
- ✅ 享受真实的语音识别和AI分析
- ✅ 管理视频转写和内容生成
- ✅ 导出多种格式的字幕文件
- ✅ 获得稳定的生产环境服务

**支持的技术**：
- 🔥 阿里云通义听悟（真实语音识别）
- 🧠 DeepSeek API（AI智能分析）
- ⚡ 高并发处理能力
- 🔒 HTTPS安全连接
- 📱 完整的监控和备份

**开始使用您的AI视频转写系统吧！** 🚀