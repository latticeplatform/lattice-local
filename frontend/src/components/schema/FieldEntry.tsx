import { type FC, useState } from "react";
import type { FieldRow } from "../../types";

const FieldEntry: FC<{ row: FieldRow; depth: number }> = ({ row, depth }) => {
  const [open, setOpen] = useState(false);
  const hasChildren = (row.children?.length ?? 0) > 0;

  return (
    <>
      <tr className="schema-row">
        <td className="schema-cell schema-cell--name">
          <span className="schema-indent" style={{ width: depth * 16 }} />
          {hasChildren ? (
            <button className="schema-expand" onClick={() => setOpen(o => !o)} aria-label="toggle">
              {open ? '▾' : '▸'}
            </button>
          ) : (
            <span className="schema-expand-gap" />
          )}
          <span className="schema-field-name">{row.name}</span>
        </td>
        <td className="schema-cell schema-cell--type">
          <code className="schema-type">{row.type}</code>
        </td>
        <td className="schema-cell schema-cell--req">
          {row.required
            ? <span className="schema-required">required</span>
            : <span className="schema-optional">optional</span>}
        </td>
        {row.doc && (
          <td className="schema-cell schema-cell--doc">{row.doc}</td>
        )}
      </tr>
      {hasChildren && open && row.children!.map(child => (
        <FieldEntry key={child.name} row={child} depth={depth + 1} />
      ))}
    </>
  );
};

export default FieldEntry;