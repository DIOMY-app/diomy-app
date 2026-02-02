import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerOAuthRoutes(app);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, engine: "Full-Hostinger-Korhogo", timestamp: Date.now() });
});

// 🛰️ OSRM (Version corrigée pour ton APK)
app.get("/api/route", async (req, res) => {
  const { start, end } = req.query;
  try {
    const response = await fetch("http://72.62.235.2:5000/route/v1/driving/" + start + ";" + end + "?overview=full&geometries=geojson&steps=true");
    const data = await response.json();

    if (data.code === "Ok" && data.routes && data.routes[0]) {
      // ON REPREND LA LOGIQUE QUI FONCTIONNAIT :
      // On ajoute la distance et la durée à la racine pour l'APK
      res.json({
        ...data,
        distance: data.routes[0].distance,
        duration: data.routes[0].duration
      });
    } else {
      res.json(data);
    }
  } catch (e) { 
    res.status(500).json({ error: "Erreur moteur OSRM Hostinger" }); 
  }
});

// 📍 PHOTON (Ton serveur Hostinger !)
app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  try {
    const response = await fetch("http://72.62.235.2:2322/api/?q=" + encodeURIComponent(String(q)) + "&limit=10");
    const data = await response.json();
    res.json(data);
  } catch (e) { res.status(500).json({ error: "Erreur moteur Photon Hostinger" }); }
});

app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

export default app;
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur DIOMY prêt sur le port ${PORT}`);
});
