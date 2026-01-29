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

// ✅ ROUTE CORRIGÉE POUR LE PRIX ET LA DISTANCE
app.get("/api/route", async (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ error: "Paramètres start et end requis" });
  }

  try {
    // Nettoyage des paramètres pour éviter les espaces ou caractères spéciaux
    const queryStart = String(start).trim();
    const queryEnd = String(end).trim();

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${queryStart};${queryEnd}?overview=full&geometries=geojson&steps=true`;
    
    // On utilise le fetch natif de Node 18+
    const response = await fetch(osrmUrl);
    
    if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ 
            error: "Le moteur de carte (OSRM) a refusé la requête", 
            details: errorText 
        });
    }

    const data = await response.json() as any;

    if (data.code !== "Ok") {
      return res.status(500).json({ error: "Erreur retournée par OSRM", details: data });
    }

    // Succès : on renvoie les données à l'application
    res.json(data);

  } catch (error: any) {
    // 🔍 DEBUG PRÉCIS : On renvoie la cause réelle de l'erreur
    console.error("Erreur calcul itinéraire:", error);
    res.status(500).json({ 
        error: "Erreur interne lors du calcul de l'itinéraire",
        message: error.message,
        hint: "Vérifiez que les coordonnées sont au format 'lon,lat'" 
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

// --- EXPORT POUR VERCEL ---
export default app;