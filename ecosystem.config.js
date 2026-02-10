module.exports = {
  apps: [{
    name: "wystawka-api",
    script: "./server/index.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 5000
    },
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // --- ZMIANY DOTYCZĄCE LOGÓW ---
    error_file: "./logs/pm2-error.log",
    out_file: "./logs/pm2-out.log",
    merge_logs: true,              // <--- KLUCZOWA ZMIANA: scala logi ze wszystkich instancji
    log_date_format: "YYYY-MM-DD HH:mm:ss", // Przydatne, aby wiedzieć, kiedy wystąpił błąd w scalonym pliku
    // ------------------------------

    kill_timeout: 3000,
    wait_ready: true,
  }]
};