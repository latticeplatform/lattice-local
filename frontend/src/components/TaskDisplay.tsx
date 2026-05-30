import { type FC, useState } from 'react';
import StatusRow from './StatusRow.tsx';
import useConnect from '../hooks/useConnect.ts';
import type { ConnectorTask } from '../types';
import useToast from '../hooks/useToast.ts';

interface TaskDisplayProps {
  connectorName: string;
  task: ConnectorTask;
}

const TaskDisplay: FC<TaskDisplayProps> = ({ connectorName, task }) => {
  const [restartingTaskId, setRestartingTaskId] = useState<number | null>(null);
  const { dispatch, refresh } = useConnect();

  const isRestarting = restartingTaskId === task.id;
  const isDisabled = restartingTaskId !== null;
  const toast = useToast();

  const handleTaskRestart = async (taskId: number) => {
    setRestartingTaskId(taskId);
    try {
      await dispatch({ type: 'CONNECTOR_RESTART_TASK', name: connectorName, taskId });
      refresh();
    } catch (e) {
      toast.push(e instanceof Error ? e.message : `Task ${String(taskId)} restart failed`);
    } finally {
      setRestartingTaskId(null);
    }
  };

  return (
    <div key={task.id} className="detail-task-row">
      <span className="detail-task-id">#{task.id}</span>
      <StatusRow state={task.state} workerId={task.worker_id} />
      <button
        className="detail-task-restart"
        onClick={() => void handleTaskRestart(task.id)}
        disabled={isDisabled}
        title={`Restart task ${String(task.id)}`}
      >
        {isRestarting ? 'Restarting…' : 'Restart'}
      </button>
    </div>
  );
};

export default TaskDisplay;
