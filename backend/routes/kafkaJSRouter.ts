import express from "express";
import { kafkaError } from "../utils.js";
import kafkaJSService from "../services/kafkaJSService.js";

const router = express.Router();

// GET /admin/brokers — broker list and cluster controller
router.get("/brokers", async (_req, res) => {
  try {
    res.json(await kafkaJSService.describeCluster());
  } catch (err) {
    kafkaError(err, res);
  }
});

// POST /admin/produce — send a message to a topic
// Body: { topic: string, messages: [{ key?: string, value: string, partition?: number }] }
router.post("/produce", async (req, res) => {
  try {
    const { topic, messages } = req.body as {
      topic: string;
      messages: { key?: string; value: string; partition?: number }[];
    };
    if (!topic || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "topic and messages[] are required" });
      return;
    }
    res.status(201).json(await kafkaJSService.produce(topic, messages));
  } catch (err) {
    kafkaError(err, res);
  }
});

export default router;