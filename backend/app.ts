import express from 'express';
import kafkaRouter from './routes/kafkaRouter.js';
import topicGroupRouter from './routes/topicGroupRouter.js';
import cors from 'cors';

const port = 5000;
const app = express();

app.use(cors())
app.use(express.json());
app.use('/api', kafkaRouter);
app.use('/api/topic-groups', topicGroupRouter);

app.listen(port, () => console.log(`Backend listening on port ${port}!`));