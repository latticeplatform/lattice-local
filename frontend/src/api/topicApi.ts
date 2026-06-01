import type { TopicsResponse, TopicGroup, TopicSchemaResult } from '../types';
import { request, voidRequest } from '../utils';

interface TopicApi {
  fetchGroups: () => Promise<TopicGroup[]>;
  fetchAll: () => Promise<TopicsResponse>;
  fetchSchema: (topicName: string) => Promise<TopicSchemaResult>;
  createGroup: (name: string, topics: string[]) => Promise<TopicGroup>;
  updateGroup: (oldName: string, name: string, topics: string[]) => Promise<TopicGroup>;
  deleteGroup: (name: string) => Promise<void>;
}

const createTopicApi = (): TopicApi => {
  const fetchAll = (): Promise<TopicsResponse> => {
    return request<TopicsResponse>('/topics', { method: 'GET' });
  };

  const fetchGroups = (): Promise<TopicGroup[]> => request<TopicGroup[]>('/topic-groups');

  const createGroup = (name: string, topics: string[]): Promise<TopicGroup> =>
    request<TopicGroup>('/topic-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, topics }),
    });

  const updateGroup = (oldName: string, name: string, topics: string[]): Promise<TopicGroup> =>
    request<TopicGroup>(`/topic-groups/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, topics }),
    });

  const deleteGroup = (name: string): Promise<void> =>
    voidRequest(`/topic-groups/${encodeURIComponent(name)}`, { method: 'DELETE' });

  const schemaCache = new Map<string, Promise<TopicSchemaResult>>();

  const fetchSchema = (topicName: string): Promise<TopicSchemaResult> => {
    const cached = schemaCache.get(topicName);
    if (cached === undefined) {
      const promise = request<TopicSchemaResult>(
        `/admin/topics/${encodeURIComponent(topicName)}/schema`
      ).catch((err: unknown) => {
        schemaCache.delete(topicName);
        throw err;
      });
      schemaCache.set(topicName, promise);
      return promise;
    } else {
      return cached;
    }
  };

  return {
    fetchAll,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    fetchSchema,
  };
};

export default createTopicApi;
