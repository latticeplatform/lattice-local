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
    case 'CONNECTOR_FETCH': {
      console.log('CONNECTOR_FETCH: ', action.name);
      const entry = await connectorApi.fetch(action.name);
      dispatch({ type: 'CONNECTOR_UPDATED', name: action.name, entry });
      return entry;
    }

    case 'CONNECTOR_CREATE': {
      console.log('CONNECTOR_CREATE: ', action.name);
      const entry = await connectorApi.create(action.name, action.config);
      dispatch({ type: 'CONNECTOR_CREATED', entry });
      return entry;
    }

    case 'CONNECTOR_REMOVE':
      console.log('CONNECTOR_REMOVE: ', action.name);
      await connectorApi.remove(action.name);
      dispatch({ type: 'CONNECTOR_DELETED', name: action.name });
      return;

    case 'CONNECTOR_PAUSE':
      console.log('CONNECTOR_PAUSE: ', action.name);
      await connectorApi.pause(action.name);
      dispatch({ type: 'CONNECTOR_PAUSED', name: action.name });
      return;

    case 'CONNECTOR_RESUME':
      console.log('CONNECTOR_RESUME: ', action.name);
      await connectorApi.resume(action.name);
      dispatch({ type: 'CONNECTOR_RESUMED', name: action.name });
      return;

    case 'CONNECTOR_RESTART':
      console.log('CONNECTOR_RESTART: ', action.name);
      await connectorApi.restart(action.name);
      dispatch({ type: 'CONNECTOR_RESTARTED', name: action.name });
      return;

    case 'CONNECTOR_RESTART_TASK':
      console.log('CONNECTOR_RESTART_TASK: ', action.name, '\nTASK_ID: ', action.taskId);
      await connectorApi.restartTask(action.name, action.taskId);
      dispatch({ type: 'TASK_RESTARTED', connectorName: action.name, taskId: action.taskId });
      return;

    case 'CONNECTOR_PATCH': {
      console.log('CONNECTOR_PATCH: ', action.name);
      const newInfo = await connectorApi.patch(action.name, action.config);
      dispatch({ type: 'CONNECTOR_UPDATED', name: action.name, entry: {info: newInfo}});
      return;
    }

    case 'PLUGIN_FETCH_CONFIG':
      console.log('PLUGIN_FETCH_CONFIG: ', action.pluginClass);
      return pluginApi.fetchConfig(action.pluginClass);

    case 'PLUGIN_VALIDATE_CONFIG':
      console.log('PLUGIN_VALIDATE_CONFIG: ', action.pluginClass);
      return pluginApi.validateConfig(action.pluginClass, action.config);

    case 'TOPIC_FETCH_GROUPS':
      console.log('TOPIC_FETCH_GROUPS');
      return topicApi.fetchGroups();

    case 'TOPIC_FETCH_SCHEMA':
      console.log('TOPIC_FETCH_SCHEMA: ', action.topicName);
      return topicApi.fetchSchema(action.topicName);

    case 'TOPIC_CREATE_GROUP':
      console.log('TOPIC_CREATE_GROUP: ', action.name);
      return topicApi.createGroup(action.name, action.topics);

    case 'TOPIC_UPDATE_GROUP':
      console.log('TOPIC_UPDATE_GROUP: ', action.oldName, '\n NEW_NAME: ', action.name);
      return topicApi.updateGroup(action.oldName, action.name, action.topics);

    case 'TOPIC_DELETE_GROUP':
      console.log('TOPIC_DELETE_GROUP: ', action.name);
      return topicApi.deleteGroup(action.name);
  }
};
export default apiActionReducer;
