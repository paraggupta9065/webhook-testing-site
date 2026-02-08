module.exports = {
  apps: [{
    name: 'hook-test',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3000,
      JWT_SECRET: process.env.JWT_SECRET || 'your-secure-secret-change-in-production',
      DATABASE_URL: process.env.DATABASE_URL || 'file:./prod.db'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};