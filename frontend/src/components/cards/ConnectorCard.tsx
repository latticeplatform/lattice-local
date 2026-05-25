import type { ConnectorState } from '../../types';
import type { FC } from "react";
import type { ConnectorCardProps } from "../../types";


const ConnectorCard: FC<ConnectorCardProps> = ({ entry, onClick }) => {
  const { connector, tasks, type } = entry.status;
  const runningTasks = tasks.filter(t => t.state === 'RUNNING').length;

  return (
    <div className="card card--clickable" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="cardHeader">
        <span className="cardName">{entry.info.name}</span>
        <span className="badge">{type}</span>
      </div>
      <StateRow state={connector.state} />
      {tasks.length > 1 && (
        <span className="taskCount">{runningTasks}/{tasks.length} tasks running</span>
      )}
    </div>
  );
};

function StateRow({ state }: { state: ConnectorState }) {
  return (
    <div className="stateRow">
      <span className="dot" data-state={state} />
      {state}
    </div>
  );
}

export default ConnectorCard;