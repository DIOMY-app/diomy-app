module.exports = {
  apps : [{
    name: "diomy-backend",
    script: "npx",
    args: "tsx server/_core/index.ts",
    env: {
      NODE_ENV: "production",
    }
  }]
}
