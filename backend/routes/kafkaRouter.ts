import express from "express";
import axios, { type AxiosResponse } from "axios";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const CONNECT_URL = process.env.KAFKA_CONNECT_URL ?? "http://localhost:8083";
const JSON_HEADERS = { "Content-Type": "application/json" };

function proxyError(err: unknown, res: express.Response) {
  if (axios.isAxiosError(err) && err.response) {
    const { status, data } = err.response as AxiosResponse;
    res.status(status).json(data ?? { error: err.message });
  } else {
    res.status(502).json({ error: "Failed to reach Kafka Connect" });
  }
}

// CONNECTOR ROUTES
// GET /connectors -> Connector list
router.get("/connectors", async (_req, res) => {
  try {
    const { data } = await axios.get(
      `${CONNECT_URL}/connectors?expand=info&expand=status`
    );
    res.json(data);
  } catch (err) {
    proxyError(err, res);
  }
});

// GET /connectors/{name} -> Get a single connector (info + status combined)
router.get("/connectors/:name", async (req, res) => {
  try {
    const [infoRes, statusRes] = await Promise.all([
      axios.get(`${CONNECT_URL}/connectors/${req.params.name}`),
      axios.get(`${CONNECT_URL}/connectors/${req.params.name}/status`),
    ]);
    res.json({ info: infoRes.data, status: statusRes.data });
  } catch (err) {
    proxyError(err, res);
  }
});

// POST /connectors -> Create a new connector
router.post("/connectors", async (req, res) => {
  try {
    const { data } = await axios.post(`${CONNECT_URL}/connectors`, req.body, { headers: JSON_HEADERS });
    res.status(201).json(data);
  } catch (err) {
    proxyError(err, res);
  }
});

// DELETE /connectors/{name} -> Delete a connector by name
router.delete("/connectors/:name", async (req, res) => {
  try {
    await axios.delete(`${CONNECT_URL}/connectors/${req.params.name}`);
    res.status(204).send();
  } catch (err) {
    proxyError(err, res);
  }
});

// PUT /connectors/{name}/pause -> Pause a connector
router.put("/connectors/:name/pause", async (req, res) => {
  try {
    await axios.put(`${CONNECT_URL}/connectors/${req.params.name}/pause`, null, { headers: JSON_HEADERS });
    res.status(202).send();
  } catch (err) {
    proxyError(err, res);
  }
});

// PUT /connectors/{name}/resume -> Resume a paused connector
router.put("/connectors/:name/resume", async (req, res) => {
  try {
    await axios.put(`${CONNECT_URL}/connectors/${req.params.name}/resume`, null, { headers: JSON_HEADERS });
    res.status(202).send();
  } catch (err) {
    proxyError(err, res);
  }
});

// POST /connectors/{name}/restart -> Restart a connector
router.post("/connectors/:name/restart", async (req, res) => {
  try {
    await axios.post(`${CONNECT_URL}/connectors/${req.params.name}/restart`, null, { headers: JSON_HEADERS });
    res.status(200).send();
  } catch (err) {
    proxyError(err, res);
  }
});

// POST /connectors/{name}/tasks/{taskId}/restart -> Restart a single task
router.post("/connectors/:name/tasks/:taskId/restart", async (req, res) => {
  try {
    await axios.post(`${CONNECT_URL}/connectors/${req.params.name}/tasks/${req.params.taskId}/restart`, null, { headers: JSON_HEADERS });
    res.status(200).send();
  } catch (err) {
    proxyError(err, res);
  }
});


// PLUGIN ROUTES
// GET /connector-plugins -> Connector plugin list
router.get("/connector-plugins", async (_req, res) => {
  try {
    const { data } = await axios.get(`${CONNECT_URL}/connector-plugins`);
    res.json(data);
  } catch (err) {
    proxyError(err, res);
  }
});

// GET /connector-plugins/{plugin-type}/config -> Get config definition for a plugin
router.get("/connector-plugins/:pluginClass/config", async (req, res) => {
  try {
    const { data } = await axios.get(
      `${CONNECT_URL}/connector-plugins/${req.params.pluginClass}/config`
    );
    res.json(data);
  } catch (err) {
    proxyError(err, res);
  }
});

// PUT /connector-plugins/{plugin-type}/config/validate -> Validate a connector configuration
router.put("/connector-plugins/:pluginClass/config/validate", async (req, res) => {
  try {
    const { data } = await axios.put(
      `${CONNECT_URL}/connector-plugins/${req.params.pluginClass}/config/validate`,
      req.body,
      { headers: JSON_HEADERS }
    );
    res.json(data);
  } catch (err) {
    proxyError(err, res);
  }
});

export default router;