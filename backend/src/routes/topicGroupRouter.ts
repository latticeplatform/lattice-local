import { Router } from 'express';

interface TopicGroup {
  name: string;
  topics: string[];
}

const defaultStore = new Map<string, TopicGroup>();

const createTopicGroupRouter = (store = defaultStore): Router => {
  const router = Router();


  router.get('/', (_req, res) => {
    res.json(Array.from(store.values()));
  });


  router.post('/', (req, res) => {
    const {name, topics} = req.body as { name: string; topics?: string[] };
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({error: 'name is required'});
      return;
    }
    if (store.has(name)) {
      res.status(409).json({error: 'Group already exists'});
      return;
    }
    const group: TopicGroup = {name, topics: topics ?? []};
    store.set(name, group);
    res.status(201).json(group);
  });


  router.put('/:name', (req, res) => {
    const oldName = req.params.name;
    const {name, topics} = req.body as { name?: string; topics: string[] };
    if (!store.has(oldName)) {
      res.status(404).json({error: 'Group not found'});
      return;
    }
    const newName = name ?? oldName;
    if (newName !== oldName && store.has(newName)) {
      res.status(409).json({error: 'Group name already taken'});
      return;
    }
    store.delete(oldName);
    const group: TopicGroup = {name: newName, topics: topics ?? []};
    store.set(newName, group);
    res.json(group);
  });


  router.delete('/:name', (req, res) => {
    if (!store.has(req.params.name)) {
      res.status(404).json({error: 'Group not found'});
      return;
    }
    store.delete(req.params.name);
    res.status(204).send();
  });

  return router;
}

export default createTopicGroupRouter;