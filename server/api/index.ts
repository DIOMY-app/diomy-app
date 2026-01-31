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
  res.json({ ok: true, engine: "Hostinger-Korhogo", timestamp: Date.now() });
});

// 🛰️ OSRM (Itinéraire via ton Hostinger si installé, sinon public par défaut)
app.get("/api/route", async (req, res) => {
  const { start, end } = req.query;
  try {
    const response = await fetch("https://router.project-osrm.org/route/v1/driving/" + start + ";" + end + "?overview=full&geometries=geojson&steps=true");
    const data = await response.json();
    res.json(data);
  } catch (e) { res.status(500).json({ error: "Erreur OSRM" }); }
});

// 📍 PHOTON (Ton serveur Hostinger dédié !)
app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  try {
    // Appel direct à TON serveur Hostinger
    const response = await fetch("http://72.62.235.2:2322/api/?q=" + encodeURIComponent(String(q)) + "&limit=10");
    const data = await response.json();
    res.json(data);
  } catch (e) { res.status(500).json({ error: "Erreur moteur Hostinger" }); }
});

app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

export default app;
