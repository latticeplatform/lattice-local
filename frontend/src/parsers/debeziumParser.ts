import type { AvroField, AvroRecordType, AvroType, TopicSchemaResult } from '../types';
import type { Extracted, FieldRow, SchemaParser } from '../types';

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
  Json: 'json',
  Uuid: 'uuid',
  ZonedTimestamp: 'timestamp (tz)',
};

const typeLabel = (type: AvroType): string => {
  if (typeof type === 'string') return type;
  if (Array.isArray(type)) {
    const nonNulls = type.filter((t) => t !== 'null');
    const nonNUllWithValue = nonNulls[0];
    return nonNUllWithValue ? typeLabel(nonNUllWithValue) : 'union';
  }
  if (type.type === 'record') return type.name;
  const connectName = type['connect.name'];
  if (connectName) {
    const tail = connectName.split('.').pop() ?? '';
    return LOGICAL_TYPES[tail] ?? tail;
  }
  return type.type;
};

const resolveRecord = (type: AvroType): AvroRecordType | null => {
  if (typeof type === 'string') return null;
  if (Array.isArray(type)) {
    for (const t of type) {
      const r = resolveRecord(t);
      if (r) return r;
    }
    return null;
  }
  return type.type === 'record' ? type : null;
};

const toRows = (fields: AvroField[]): FieldRow[] =>
  fields.map((f) => {
    const nested = resolveRecord(f.type);
    return {
      name: f.name,
      type: typeLabel(f.type),
      required: !('default' in f),
      children: nested ? toRows(nested.fields) : undefined,
    };
  });

export const debeziumParser: SchemaParser = {
  canParse: (result: TopicSchemaResult) => result.source === 'debezium-json',

  parse: (result: TopicSchemaResult): Extracted | null => {
    const afterField = result.fields.find((f) => f.name === 'after');
    const nested = afterField ? resolveRecord(afterField.type) : null;
    const recordFields = nested?.fields ?? result.fields;
    return { rows: toRows(recordFields), section: nested ? 'after' : 'envelope' };
  },
};
