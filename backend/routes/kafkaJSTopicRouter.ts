import express from "express";
import { kafkaError, parseValue } from "../utils.js";
import kafkaJSService from "../services/kafkaJSService.js";

const router = express.Router();

// GET /admin/topics — list all topic names
router.get("/", async (_req, res) => {
  try { res.json(await kafkaJSService.listTopics()); }
  catch (err) { kafkaError(err, res); }
});

// POST /admin/topics — create one or more topics
// Body: { topics: [{ topic: string, numPartitions?: number, replicationFactor?: number }] }
router.post("/", async (req, res) => {
  try {
    const { topics } = req.body as {
      topics: { topic: string; numPartitions?: number; replicationFactor?: number }[];
    };
    if (!Array.isArray(topics) || topics.length === 0) {
      res.status(400).json({ error: "topics array is required" });
      return;
    }
    res.status(201).json({ created: await kafkaJSService.createTopics(topics) });
  } catch (err) { kafkaError(err, res); }
});

// GET /admin/topics/:name/metadata — partitions, leaders, replicas, ISR
router.get("/:name/metadata", async (req, res) => {
  try { res.json(await kafkaJSService.getTopicMetadata(req.params.name)); }
  catch (err) { kafkaError(err, res); }
});

// GET /admin/topics/:name/offsets — earliest & latest offset per partition
router.get("/:name/offsets", async (req, res) => {
  try { res.json(await kafkaJSService.getTopicOffsets(req.params.name)); }
  catch (err) { kafkaError(err, res); }
});

// GET /admin/topics/:name/schema — peek at the first message to extract its schema
router.get("/:name/schema", async (req, res) => {
  try { res.json(await kafkaJSService.peekTopicSchema(req.params.name)); }
  catch (err) { kafkaError(err, res); }
});

// GET /admin/topics/:name/stream?from=beginning — SSE live message stream
router.get("/:name/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let stopped = false;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let consumer: Awaited<ReturnType<typeof kafkaJSService.createStreamConsumer>> | undefined;

  const send = (event: string, data: unknown) => {
    if (!stopped) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const cleanup = async () => {
    if (stopped) return;
    stopped = true;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    await consumer?.disconnect().catch(() => {});
  };

  req.on("close", cleanup);

  try {
    consumer = await kafkaJSService.createStreamConsumer(req.params.name, req.query.from === "beginning");

    heartbeatTimer = setInterval(() => {
      if (!stopped) res.write(": heartbeat\n\n");
    }, 15_000);

    await consumer.run({
      eachMessage: async ({ partition, message }) => {
        if (stopped) return;

        let payload: unknown = null;
        let schema: unknown = undefined;
        let schemaId: number | undefined;

        if (message.value) {
          const parsed = await parseValue(message.value).catch(() => ({
            format: "string" as const,
            payload: message.value!.toString("utf-8"),
          }));
          payload = parsed.payload;
          if (parsed.format === "apicurio") { schemaId = parsed.schemaId; schema = parsed.schema; }
          if (parsed.format === "debezium-json") { schema = parsed.schema; }
        }

        let key: unknown = null;
        if (message.key) {
          const parsedKey = await parseValue(message.key).catch(() => ({
            format: "string" as const,
            payload: message.key!.toString("utf-8"),
          }));
          key = parsedKey.payload;
        }

        send("message", {
          offset: message.offset,
          partition,
          key,
          timestamp: message.timestamp,
          schemaId,
          schema,
          value: payload,
        });
      },
    });
  } catch (err) {
    send("error", { error: err instanceof Error ? err.message : "Stream error" });
    await cleanup();
  }
});

// DELETE /admin/topics/:name — delete a topic
router.delete("/:name", async (req, res) => {
  try {
    await kafkaJSService.deleteTopic(req.params.name);
    res.status(204).send();
  } catch (err) { kafkaError(err, res); }
});

export default router;