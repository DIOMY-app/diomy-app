module.exports = {
  apps: [{
    name: 'diomy-backend',
    // ✅ On change le chemin ici :
    script: './dist-server/server/_core/index.js', 
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // ⚠️ ASSURE-TOI QUE CETTE VALEUR EST LA BONNE :
      OAUTH_SERVER_URL: 'http://72.62.235.2:3000', 
      OSRM_URL: 'http://localhost:5000'
    },
    // ... reste du fichier
  }]
};
