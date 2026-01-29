import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

const app = express();

// ... tes middlewares (CORS, JSON, etc.) restent identiques ...

// --- ROUTES ---
registerOAuthRoutes(app);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, deployment: "Vercel", timestamp: Date.now() });
});

// ✅ AJOUT DE LA ROUTE MANQUANTE POUR LE PRIX ET LA DISTANCE
app.get("/api/route", async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: "Paramètres start et end requis" });
  }

  try {
    // Appel au moteur OSRM gratuit
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true`;
    
    const response = await fetch(osrmUrl);
    const data = await response.json() as any;

    if (data.code !== "Ok") {
      return res.status(500).json({ error: "Erreur OSRM", details: data });
    }

    // On renvoie les données à l'application
    res.json(data);
  } catch (error) {
    console.error("Erreur calcul itinéraire:", error);
    res.status(500).json({ error: "Erreur lors du calcul de l'itinéraire" });
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