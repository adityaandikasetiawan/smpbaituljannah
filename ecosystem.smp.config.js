module.exports = {
  apps: [{
    name: 'smpit-baituljannah',
    script: 'app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    node_args: '--optimize_for_size --max_old_space_size=460 --gc_interval=100',
    env: {
      NODE_ENV: 'production',
      PORT: 8080,
      HOST: '0.0.0.0',
      DB_HOST: 'localhost',
      DB_USER: 'root',
      DB_PASSWORD: 'Corei7gen',
      DB_NAME: 'smp_baitul_jannah_db',
      SESSION_SECRET: 'smpbaituljannahsecretkey',
      APP_TYPE: 'SMP'
    }
  }]
};
