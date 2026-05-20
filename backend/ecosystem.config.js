module.exports = {
  apps: [
    {
      name: 'sistema-tork-backend',
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://postgres:Synyster852@database-1.c7umooq222zk.sa-east-1.rds.amazonaws.com:5432/postgres?sslmode=require',
        DIRECT_URL: 'postgresql://postgres:Synyster852@database-1.c7umooq222zk.sa-east-1.rds.amazonaws.com:5432/postgres?sslmode=require',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
