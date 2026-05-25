import { useState, type FC } from 'react';
import './SchemaDoc.css';
import type { Extracted } from '../../types';
import type { TopicSchemaResult } from '../../types';
import type { SchemaParser } from '../../types';
import FieldEntry from './FieldEntry.tsx';
import { debeziumParser } from '../../parsers/debeziumParser.ts';
import { avroParser } from '../../parsers/avroParser.ts';

const PARSERS: SchemaParser[] = [debeziumParser, avroParser];

const extract = (result: TopicSchemaResult): Extracted | null =>
  PARSERS.find((p) => p.canParse(result))?.parse(result) ?? null;

const SchemaDoc: FC<{ result: TopicSchemaResult }> = ({ result }) => {
  const [raw, setRaw] = useState(false);
  const extracted = extract(result);
  const hasDoc = extracted?.rows.some((r) => r.doc);

  return (
    <div className="schema-doc">
      <div className="schema-doc-meta">
        <span className="badge">{result.source}</span>
        {result.schemaType && <span className="badge">{result.schemaType}</span>}
        {result.schemaId != null && <span className="detail-worker">ID {result.schemaId}</span>}
        {extracted && (
          <>
            <button className="schema-toggle" onClick={() => setRaw((r) => !r)}>
              {raw ? 'parsed' : 'raw'}
            </button>
          </>
        )}
      </div>

      {raw || !extracted ? (
        <pre className="detail-schema-block">{JSON.stringify(result.schema, null, 2)}</pre>
      ) : (
        <div className="schema-table-wrap">
          <table className="schema-table">
            <thead>
              <tr>
                <th className="schema-th">Field</th>
                <th className="schema-th">Type</th>
                <th className="schema-th">Required</th>
                {hasDoc && <th className="schema-th">Description</th>}
              </tr>
            </thead>
            <tbody>
              {extracted.rows.map((row) => (
                <FieldEntry key={row.name} row={row} depth={0} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SchemaDoc;
