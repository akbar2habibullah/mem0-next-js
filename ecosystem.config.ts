// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'mem0-next-app', // Your application name
      script: 'node_modules/.bin/next', // Path to the next executable
      args: 'start',     // Argument to pass to the script (start next server)
      instances: 'max',  // Or a specific number, e.g., 2. 'max' uses all available CPUs
      exec_mode: 'cluster',// Enable clustering
      watch: false,      // Don't use watch in production with Docker
      max_memory_restart: '2G', // Optional: restart if it exceeds G RAM
      env: {
        NODE_ENV: 'production',
        // PORT: 3000 // Next.js will use this port; otherwise, defaults to 3000
      },
    },
  ],
};