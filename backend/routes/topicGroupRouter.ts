import express from 'express';

interface TopicGroup {
  name: string;
  topics: string[];
}

const groups = new Map<string, TopicGroup>();

const router = express.Router();

router.get('/', (_req, res) => {
  res.json(Array.from(groups.values()));
});

router.post('/', (req, res) => {
  const { name, topics } = req.body as { name: string; topics?: string[] };
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (groups.has(name)) {
    res.status(409).json({ error: 'Group already exists' });
    return;
  }
  const group: TopicGroup = { name, topics: topics ?? [] };
  groups.set(name, group);
  res.status(201).json(group);
});

router.put('/:name', (req, res) => {
  const oldName = req.params.name;
  const { name, topics } = req.body as { name?: string; topics: string[] };
  if (!groups.has(oldName)) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const newName = name ?? oldName;
  if (newName !== oldName && groups.has(newName)) {
    res.status(409).json({ error: 'Group name already taken' });
    return;
  }
  groups.delete(oldName);
  const group: TopicGroup = { name: newName, topics: topics ?? [] };
  groups.set(newName, group);
  res.json(group);
});

router.delete('/:name', (req, res) => {
  if (!groups.has(req.params.name)) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  groups.delete(req.params.name);
  res.status(204).send();
});

export default router;