# 🚀 生产环境部署指南

## 📋 部署前准备

### 1. 环境要求
- Node.js 18+
- Nginx 或 Apache
- 支持HTTPS的域名
- 阿里云通义听悟服务（已配置）

### 2. 已配置的API凭证
✅ **DeepSeek API**: `sk-5eeca5c4321b4562bb3a58ae77751721`
✅ **通义千问API**: `sk-be0085afc5fd46c293ffb040b7cac8d9`
✅ **通义听悟AppKey**: `eNnot8DLOV3RpOut`
✅ **通义听悟Token**: `5180bec184894b2a8cf7878b92d62ce3`

## 🏗️ 构建步骤

### 1. 构建生产版本
```bash
# 运行构建脚本
./build-for-production.sh

# 或手动构建
npm run build
```

### 2. 构建完成验证
构建成功后会生成：
- `dist/` 目录（或 `build/`）
- `production-info.json` 文件

## 🌐 部署方案

### 方案1: 直接部署到域名
```bash
# 1. 上传构建文件
scp -r dist/ user@your-server:/var/www/captainai.cc/

# 2. 配置Nginx
# /etc/nginx/sites-available/captainai.cc
server {
    listen 80;
    server_name captainai.cc;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name captainai.cc;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    root /var/www/captainai.cc;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理（如果有后端API）
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 方案2: 使用云服务（推荐）
#### Vercel 部署
```bash
# 安装Vercel CLI
npm i -g vercel

# 登录并部署
vercel login
vercel --prod
```

#### Netlify 部署
```bash
# 拖拽dist文件夹到Netlify控制台
# 或使用Netlify CLI
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

#### 阿里云部署
```bash
# 使用OSS+CDN
# 1. 上传到OSS
# 2. 配置CDN加速
# 3. 绑定自定义域名
```

## 🔧 生产环境配置

### 1. 环境变量设置
确保生产环境使用 `.env.production` 中的配置：

```bash
# 阿里云API配置
VITE_TINGWU_APPKEY=eNnot8DLOV3RpOut
VITE_TINGWU_TOKEN=5180bec184894b2a8cf7878b92d62ce3
VITE_DEEPSEEK_API_KEY=sk-5eeca5c4321b4562bb3a58ae77751721
VITE_QWEN_API_KEY=sk-be0085afc5fd46c293ffb040b7cac8d9
```

### 2. CORS配置
```javascript
// 如果有后端API，确保CORS配置正确
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://captainai.cc');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
```

## 🧪 部署后测试

### 1. 基础功能测试
- [ ] 网站可以正常访问
- [ ] 前端页面显示正常
- [ ] 管理后台可以访问

### 2. AI功能测试
- [ ] AI全篇解析功能正常
- [ ] **视频转写功能返回真实结果**
- [ ] 关键词提取功能正常
- [ ] 智能对话功能正常

### 3. 性能测试
- [ ] 页面加载速度
- [ ] API响应时间
- [ ] 视频转写处理时间

## 📊 生产环境特性

### ✅ 已启用的功能
- **真实语音识别** - 阿里云通义听悟
- **AI智能分析** - DeepSeek API
- **精确时间戳** - 毫秒级精度
- **多格式支持** - SRT, VTT, 文本导出
- **实时处理** - WebSocket连接
- **错误恢复** - 完善的降级机制

### 🔧 技术栈
- **前端**: React + TypeScript + Vite
- **语音识别**: 阿里云通义听悟
- **AI分析**: DeepSeek API
- **构建**: Vite + 生产优化
- **部署**: 支持多种云服务

## 🔄 监控和维护

### 1. 性能监控
- 网站加载时间
- API响应时间
- 错误日志监控

### 2. API配额监控
- DeepSeek API调用次数
- 通义听悟转写时长
- 存储空间使用

### 3. 日志管理
- 前端错误日志
- API调用日志
- 用户行为分析

## 🚨 故障排除

### 常见问题

#### 1. 视频转写失败
**原因**: API配置或网络问题
**解决**:
- 检查环境变量配置
- 验证Token有效性
- 检查网络连接

#### 2. AI分析超时
**原因**: API响应时间过长
**解决**:
- 增加超时时间
- 检查API配额
- 优化请求内容

#### 3. 网站加载慢
**原因**: 静态资源过大
**解决**:
- 启用Gzip压缩
- 使用CDN加速
- 优化图片资源

## 📞 技术支持

如果在部署过程中遇到问题：

1. **查看控制台错误** - F12 → Console
2. **检查网络请求** - F12 → Network
3. **验证API配置** - 检查环境变量
4. **联系技术支持** - 提供错误信息和日志

---

**🎉 部署成功后，您将拥有完整的AI视频转写系统！**

- ✅ 真实的语音识别
- ✅ 精确的时间戳
- ✅ 智能AI分析
- ✅ 完整的导出功能
- ✅ 稳定的生产环境服务