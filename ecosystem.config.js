module.exports = {
  apps: [{
    name: 'smpit-baituljannah',
    script: './app.js',
    cwd: '/var/www/html/smpbaituljannah',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
      HOST: '36.66.42.227',
      SESSION_SECRET: 'smpit-baituljannah-secret-2024'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002,
      HOST: '36.66.42.227',
      SESSION_SECRET: 'smpit-baituljannah-secret-2024'
    },
    merge_logs: true,
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
