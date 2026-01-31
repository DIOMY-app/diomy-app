import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

const app = express();

// --- MIDDLEWARES ---
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- ROUTES ---
registerOAuthRoutes(app);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, deployment: "Vercel", timestamp: Date.now() });
});

// 🛰️ PONT GPS OSRM (Itinéraires)
app.get("/api/route", async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: "Paramètres start et end requis" });

  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true`;
    const response = await fetch(osrmUrl);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("[GPS-BRIDGE] Erreur OSRM:", error.message);
    res.status(500).json({ error: "Erreur lors du calcul de l'itinéraire" });
  }
});

// 📍 PONT PHOTON (Recherche d'adresses)
app.get("/api/search", async (req, res) => {
  const { q, limit, lang } = req.query;
  if (!q) return res.status(400).json({ error: "Le paramètre de recherche 'q' est requis" });

  try {
    // On redirige vers l'instance publique de Photon
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(String(q))}&limit=${limit || 10}&lang=${lang || 'fr'}`;
    
    console.log("Appel Photon vers:", photonUrl);

    const response = await fetch(photonUrl);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("[PHOTON-BRIDGE] Erreur recherche:", error.message);
    res.status(500).json({ error: "Erreur lors de la recherche d'adresse" });
  }
});

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

export default app;