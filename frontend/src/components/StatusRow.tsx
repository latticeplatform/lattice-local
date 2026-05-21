import type { ConnectorState } from "../types/connect.ts";
import type { FC } from "react";


interface StatusRowProps {
  state: ConnectorState;
  workerId: string;
}

const StatusRow: FC<StatusRowProps> = ({ state, workerId }) => {
  return (
    <div className="detail-status-row">
      <span className="dot" data-state={state} />
      <span className="detail-state">{state}</span>
      {workerId && (
        <>
          <span className="detail-sep">·</span>
          <span className="detail-worker">{workerId}</span>
        </>
      )}
    </div>
  );
}

export default StatusRow;