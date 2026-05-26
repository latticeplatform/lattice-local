import type { Dispatch } from 'react';
import createConnectorApi from '../api/connectorApi';
import createPluginApi from '../api/pluginApi';
import createTopicApi from '../api/topicApi';
import type { ConnectDispatchAction } from '../types';
import type { ConnectAction } from '../types';

const connectorApi = createConnectorApi();
const pluginApi = createPluginApi();
const topicApi = createTopicApi();

const apiActionReducer = async (
  action: ConnectDispatchAction,
  dispatch: Dispatch<ConnectAction>
): Promise<unknown> => {
  switch (action.type) {
    case 'CONNECTOR_FETCH':
      return connectorApi.fetch(action.name);

    case 'CONNECTOR_CREATE': {
      await connectorApi.create(action.name, action.config);
      const entry = await connectorApi.fetch(action.name);
      dispatch({ type: 'CONNECTOR_CREATED', entry });
      return entry;
    }

    case 'CONNECTOR_REMOVE':
      await connectorApi.remove(action.name);
      dispatch({ type: 'CONNECTOR_DELETED', name: action.name });
      return;

    case 'CONNECTOR_PAUSE':
      await connectorApi.pause(action.name);
      dispatch({ type: 'CONNECTOR_PAUSED', name: action.name });
      return;

    case 'CONNECTOR_RESUME':
      await connectorApi.resume(action.name);
      dispatch({ type: 'CONNECTOR_RESUMED', name: action.name });
      return;

    case 'CONNECTOR_RESTART':
      await connectorApi.restart(action.name);
      dispatch({ type: 'CONNECTOR_RESTARTED', name: action.name });
      return;

    case 'CONNECTOR_RESTART_TASK':
      await connectorApi.restartTask(action.name, action.taskId);
      dispatch({ type: 'TASK_RESTARTED', connectorName: action.name, taskId: action.taskId });
      return;

    case 'PLUGIN_FETCH_CONFIG':
      return pluginApi.fetchConfig(action.pluginClass);

    case 'PLUGIN_VALIDATE_CONFIG':
      return pluginApi.validateConfig(action.pluginClass, action.config);

    case 'TOPIC_FETCH_GROUPS':
      return topicApi.fetchGroups();

    case 'TOPIC_FETCH_SCHEMA':
      return topicApi.fetchSchema(action.topicName);

    case 'TOPIC_CREATE_GROUP':
      return topicApi.createGroup(action.name, action.topics);

    case 'TOPIC_UPDATE_GROUP':
      return topicApi.updateGroup(action.oldName, action.name, action.topics);

    case 'TOPIC_DELETE_GROUP':
      return topicApi.deleteGroup(action.name);
  }
};
export default apiActionReducer;
