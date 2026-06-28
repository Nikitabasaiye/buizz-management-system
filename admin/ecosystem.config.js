module.exports = {
  apps: [
    {
      name: 'buizz-admin-app',
      script: './server.js',
      cwd: './',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        ADMIN_PORT: 5001
      },
      env_development: {
        NODE_ENV: 'development',
        ADMIN_PORT: 5001
      },
      error_file: './logs/admin-error.log',
      out_file: './logs/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
      watch: false,
      ignore_watch: ['node_modules', 'logs'],
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      autorestart: true
    }
  ]
};
