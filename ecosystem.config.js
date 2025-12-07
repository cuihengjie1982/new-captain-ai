module.exports = {
  apps: [{
    name: 'captain-ai',
    script: 'serve',
    args: '-s dist -l 3001',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'your-production-api-key'
    },
    env_production: {
      NODE_ENV: 'production',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'your-production-api-key'
    },
    log_file: '/var/log/pm2/captain-ai.log',
    out_file: '/var/log/pm2/captain-ai-out.log',
    error_file: '/var/log/pm2/captain-ai-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};