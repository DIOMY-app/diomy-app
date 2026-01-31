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
  res.json({ ok: true, deployment: "Vercel-Photon-FINAL-V1", timestamp: Date.now() });
});

app.get("/api/route", async (req, res) => {
  const { start, end } = req.query;
  try {
    const osrmUrl = "https://router.project-osrm.org/route/v1/driving/" + start + ";" + end + "?overview=full&geometries=geojson&steps=true";
    const response = await fetch(osrmUrl);
    const data = await response.json();
    res.json(data);
  } catch (e) { res.status(500).json({ error: "Erreur OSRM" }); }
});

app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  try {
    const response = await fetch("https://photon.komoot.io/api/?q=" + encodeURIComponent(String(q)) + "&limit=10");
    const data = await response.json();
    res.json(data);
  } catch (e) { res.status(500).json({ error: "Erreur Photon" }); }
});

app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

export default app;
