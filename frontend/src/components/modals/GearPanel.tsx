import { type Dispatch, type FC, type SetStateAction, useCallback, useState } from "react";
import { groupByKey } from "../../utils/utils.ts";
import type { ConfigDefinition } from "../../types/connect.ts";

interface GearPanelProps {
  optionalDefs: ConfigDefinition[];
  enabledOptional: Set<string>;
  setEnabledOptional: Dispatch<SetStateAction<Set<string>>>;
  setValues: Dispatch<SetStateAction<Record<string, string>>>
}

const GearPanel: FC<GearPanelProps> = ({optionalDefs, setEnabledOptional, setValues, enabledOptional}) => {
  const [optionalSearch, setOptionalSearch] = useState('');


  const filteredOptional = optionalDefs.filter(d =>
    optionalSearch === '' ||
    d.display_name.toLowerCase().includes(optionalSearch.toLowerCase()) ||
    d.name.toLowerCase().includes(optionalSearch.toLowerCase())
  );

  const optionalGrouped = groupByKey(filteredOptional, d => d.group ?? 'General');


  const toggleOptional = useCallback((def: ConfigDefinition) => {
    setEnabledOptional(prev => {
      const next = new Set(prev);
      if (next.has(def.name)) {
        next.delete(def.name);
        setValues(v => { const c = { ...v }; delete c[def.name]; return c; });
      } else {
        next.add(def.name);
        if (def.default_value) {
          setValues(v => ({ ...v, [def.name]: def.default_value! }));
        }
      }
      return next;
    });
  }, []);


  return (
    <div className="gear-panel">
      <input
        className="gear-search"
        placeholder="Search optional fields…"
        value={optionalSearch}
        onChange={e => setOptionalSearch(e.target.value)}
        autoFocus
      />
      <div className="gear-list">
        {Object.entries(optionalGrouped).map(([group, defs]) => (
          <div key={group} className="gear-group">
            <p className="gear-group-title">{group}</p>
            {defs.map(def => (
              <label key={def.name} className="gear-item">
                <input
                  type="checkbox"
                  checked={enabledOptional.has(def.name)}
                  onChange={() => toggleOptional(def)}
                />
                <span title={def.documentation} >{def.display_name}</span>
              </label>
            ))}
          </div>
        ))}
        {filteredOptional.length === 0 && (
          <span className="gear-empty">No matching fields.</span>
        )}
      </div>
    </div>
  )
};

export default GearPanel;