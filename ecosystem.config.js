module.exports = {
  apps: [{
    name: 'diomy-backend',
    // ✅ On pointe sur le fichier source que nous avons réparé ensemble
    script: './server/api/index.ts', 
    interpreter: 'bun', // ✅ Indispensable pour lire le .ts directement
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // ✅ On garde tes variables de production
      OAUTH_SERVER_URL: 'https://diomy-app.vercel.app', 
      OSRM_URL: 'http://localhost:5000'
    },
    // ✅ Sécurité pour la stabilité
    autorestart: true,
    max_memory_restart: '1G'
  }]
};