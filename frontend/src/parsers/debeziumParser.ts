import type { TopicSchemaResult } from '../types/connect.ts';
import type { Extracted, FieldRow, SchemaParser } from '../types/schemaTypes.ts';

interface DebeziumField {
  field: string;
  type: string;
  optional: boolean;
  name?: string; // logical type (e.g. "io.debezium.time.MicroTimestamp")
  fields?: DebeziumField[];
}

const LOGICAL_TYPES: Record<string, string> = {
  MicroTimestamp: 'timestamp (µs)',
  Timestamp: 'timestamp (ms)',
  NanoTimestamp: 'timestamp (ns)',
  MicroTime: 'time (µs)',
  Time: 'time (ms)',
  NanoTime: 'time (ns)',
  Date: 'date',
  Decimal: 'decimal',
  VariableScaleDecimal: 'decimal',
  Bits: 'bits',
  Json: 'json',
  Uuid: 'uuid',
  Geometry: 'geometry',
  Point: 'point',
  ZonedTimestamp: 'timestamp (tz)',
  Year: 'year',
};

const typeLabel = (f: DebeziumField): string => {
  if (f.name) {
    const tail = f.name.split('.').pop() ?? '';
    return LOGICAL_TYPES[tail] ?? tail;
  }
  return f.type;
}

const toRows = (fields: DebeziumField[]): FieldRow[] => {
  return fields.map(f => ({
    name: f.field,
    type: f.type === 'struct' ? 'struct' : typeLabel(f),
    required: !f.optional,
    children: f.type === 'struct' && Array.isArray(f.fields)
      ? toRows(f.fields)
      : undefined,
  }));
}

export const debeziumParser: SchemaParser = {
  canParse: (result: TopicSchemaResult) => result.source === 'debezium-json',

  parse: (result: TopicSchemaResult): Extracted | null => {
    const s = result.schema as Record<string, unknown> | null;
    if (!s) return null;
    const fields = s['fields'] as DebeziumField[] | undefined;
    if (!Array.isArray(fields)) return null;
    const afterField = fields.find(f => f.field === 'after' && f.type === 'struct');
    const recordFields = afterField?.fields ?? fields;
    return { rows: toRows(recordFields), section: afterField ? 'after' : 'envelope' };
  },
};