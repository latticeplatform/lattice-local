import type { TopicSchemaResult } from '../types';
import type { Extracted, FieldRow, SchemaParser } from '../types';

interface AvroField {
  name: string;
  type: unknown;
  doc?: string;
  default?: unknown;
}

const LOGICAL_TYPES: Record<string, string> = {
  'timestamp-micros': 'timestamp (µs)',
  'timestamp-millis': 'timestamp (ms)',
  'local-timestamp-micros': 'timestamp (µs, local)',
  'local-timestamp-millis': 'timestamp (ms, local)',
  'date': 'date',
  'time-micros': 'time (µs)',
  'time-millis': 'time (ms)',
  'uuid': 'uuid',
  'decimal': 'decimal',
  'duration': 'duration',
};

const typeInfo = (type: unknown): { label: string; nullable: boolean } => {
  if (typeof type === 'string') return { label: type, nullable: false };
  if (Array.isArray(type)) {
    const nonNull = (type as unknown[]).filter(t => t !== 'null');
    const inner = nonNull.length === 1
      ? typeInfo(nonNull[0])
      : { label: 'union', nullable: false };
    return { ...inner, nullable: (type as unknown[]).includes('null') };
  }
  if (type && typeof type === 'object') {
    const t = type as { type?: string; logicalType?: string; items?: unknown; values?: unknown };
    if (t.logicalType && LOGICAL_TYPES[t.logicalType]) {
      return { label: LOGICAL_TYPES[t.logicalType] ?? t.logicalType, nullable: false };
    }
    if (t.type === 'array') return { label: `array<${typeInfo(t.items).label}>`, nullable: false };
    if (t.type === 'map') return { label: `map<string, ${typeInfo(t.values).label}>`, nullable: false };
    if (t.type === 'record') return { label: 'record', nullable: false };
    return { label: t.type ?? 'complex', nullable: false };
  }
  return { label: String(type), nullable: false };
}

const toRows = (fields: AvroField[]): FieldRow[] => {
  return fields.map(f => {
    const { label, nullable } = typeInfo(f.type);
    return {
      name: f.name,
      type: label,
      required: !nullable && !('default' in f),
      doc: f.doc,
    };
  });
}

export const avroParser: SchemaParser = {
  canParse: (result: TopicSchemaResult) => result.source === 'apicurio',

  parse: (result: TopicSchemaResult): Extracted | null => {
    const s = result.schema as Record<string, unknown> | null;
    if (!s) return null;
    const fields = s['fields'] as AvroField[] | undefined;
    if (!Array.isArray(fields)) return null;
    return { rows: toRows(fields), section: 'record' };
  },
};