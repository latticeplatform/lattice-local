import express from 'express';
import createKafkaConnectRouter from './routes/kafkaConnectRouter.js';
import createKafkaJSRouter from './routes/kafkaJSRouter.js';
import createTopicGroupRouter from './routes/topicGroupRouter.js';
import createKafkaJSTopicRouter from "./routes/kafkaJSTopicRouter.js";
import kafkaJSService from "./services/kafkaJSService.js";
import cors from 'cors';

const port = 5000;
const app = express();



app.use(cors())
app.use(express.json());
app.use('/api', createKafkaConnectRouter());
app.use('/api/admin', createKafkaJSRouter(kafkaJSService));
app.use('/api/admin/topics', createKafkaJSTopicRouter(kafkaJSService));
app.use('/api/topic-groups', createTopicGroupRouter());

app.listen(port, () => console.log(`Backend listening on port ${port}!`));