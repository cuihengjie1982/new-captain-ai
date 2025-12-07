#!/bin/bash

# 生产环境构建脚本
echo "🚀 开始生产环境构建..."

# 清理之前的构建文件
echo "📁 清理构建目录..."
rm -rf dist
rm -rf build

# 安装依赖
echo "📦 安装依赖..."
npm ci

# 构建生产版本
echo "🔨 构建生产版本..."
npm run build

# 检查构建结果
if [ -d "dist" ] || [ -d "build" ]; then
    echo "✅ 构建成功！"
    echo ""
    echo "📦 构建文件位置:"
    if [ -d "dist" ]; then
        echo "   - dist/ 目录"
        ls -la dist/
    fi
    if [ -d "build" ]; then
        echo "   - build/ 目录"
        ls -la build/
    fi
    echo ""
    echo "🌐 部署说明:"
    echo "1. 将构建文件上传到生产服务器"
    echo "2. 配置生产服务器的环境变量"
    echo "3. 启动生产服务器"
    echo "4. 测试真实API功能"
else
    echo "❌ 构建失败！"
    exit 1
fi

# 创建生产环境信息文件
cat > production-info.json << EOF
{
  "buildTime": "$(date)",
  "environment": "production",
  "apiConfig": {
    "tingwuAppKey": "eNnot8DLOV3RpOut",
    "deepseekApiKey": "sk-5eeca5c4321b4562bb3a58ae77751721",
    "qwenApiKey": "sk-be0085afc5fd46c293ffb040b7cac8d9"
  },
  "features": {
    "realTimeTranscription": true,
    "aiAnalysis": true,
    "videoProcessing": true,
    "databaseIntegration": true
  }
}
EOF

echo "✅ 生产环境信息已保存到 production-info.json"