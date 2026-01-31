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

// ✅ ROUTE CORRIGÉE : Utilise l'URL publique et gère les erreurs de fetch
app.get("/api/route", async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: "Paramètres start et end requis" });
  }

  try {
    const queryStart = String(start).trim();
    const queryEnd = String(end).trim();

    // On force l'URL publique de l'API OSRM (Demo server)
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${queryStart};${queryEnd}?overview=full&geometries=geojson&steps=true`;
    
    console.log("Appel OSRM vers:", osrmUrl);

    const response = await fetch(osrmUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OSRM API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as any;

    if (data.code !== "Ok") {
      return res.status(500).json({ error: "Erreur retournée par OSRM", details: data });
    }

    res.json(data);

  } catch (error: any) {
    console.error("[GPS-BRIDGE] Erreur critique itinéraire:", error.message);
    res.status(500).json({ 
        error: "Erreur lors du calcul de l'itinéraire",
        details: error.message,
        hint: "Vérifiez que le serveur OSRM public est accessible" 
    });
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