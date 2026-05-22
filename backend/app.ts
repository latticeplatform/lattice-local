import express from 'express';
import kafkaConnectRouter from './routes/kafkaConnectRouter.js';
import kafkaJSRouter from './routes/kafkaJSRouter.js';
import topicGroupRouter from './routes/topicGroupRouter.js';
import cors from 'cors';
import kafkaJSTopicRouter from "./routes/kafkaJSTopicRouter.js";

const port = 5000;
const app = express();

app.use(cors())
app.use(express.json());
app.use('/api', kafkaConnectRouter);
app.use('/api/admin', kafkaJSRouter);
app.use('/api/admin/topics', kafkaJSTopicRouter);
app.use('/api/topic-groups', topicGroupRouter);

app.listen(port, () => console.log(`Backend listening on port ${port}!`));