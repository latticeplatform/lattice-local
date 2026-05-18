import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const CONNECT_URL = process.env.KAFKA_CONNECT_URL ?? "http://localhost:8083";

// CONNECTOR ROUTES
// GET /connectors -> Connector list
router.get("/connectors", async (_req, res) => {
  try {
    const { data } = await axios.get(
      `${CONNECT_URL}/connectors?expand=info&expand=status`
    );
    res.json(data);
  } catch {
    res.status(502).json({ error: "Failed to reach Kafka Connect" });
  }
});

// POST /connectors -> Create a new connector
// GET /connectors/{name} -> Get a connector by name
// DELETE /connectors/{name} -> Delete a connector by name
// PUT /connectors/{name}/config -> Update a connector by name
// GET /connectors/{name}/status -> Get a connector's status by name

// PLUGIN ROUTES
// GET /connector-plugins -> Connector plugin list
router.get("/connector-plugins", async (_req, res) => {
  try {
    const { data } = await axios.get(`${CONNECT_URL}/connector-plugins`);
    res.json(data);
  } catch {
    res.status(502).json({ error: "Failed to reach Kafka Connect" });
  }
});

// GET /connector-plugins/{plugin-type}/config -> Get a connector plugin configuration by name
// PUT /connector-plugins/{plugin-type}/config/validate -> Validate a connector configuration

export default router;
