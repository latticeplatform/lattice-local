import type { AvroField, AvroRecordType, AvroType, TopicSchemaResult } from '../types';
import type { Extracted, FieldRow, SchemaParser } from '../types';

const typeInfo = (type: AvroType): { label: string; nullable: boolean } => {
  if (typeof type === 'string') return { label: type, nullable: false };
  if (Array.isArray(type)) {
    const nonNulls = type.filter((t) => t !== 'null');
    const nonNullWithValue = nonNulls[0];
    const inner = nonNullWithValue
      ? typeInfo(nonNullWithValue)
      : { label: 'union', nullable: false };
    return { ...inner, nullable: type.includes('null') };
  }
  if (type.type === 'record') return { label: type.name, nullable: false };
  if (type.type === 'enum') return { label: type.name, nullable: false };
  if (type.type === 'array')
    return { label: `array<${typeInfo(type.items).label}>`, nullable: false };
  if (type.type === 'map')
    return { label: `map<string, ${typeInfo(type.values).label}>`, nullable: false };
  const connectName = type['connect.name'];
  return {
    label: connectName ? (connectName.split('.').pop() ?? type.type) : type.type,
    nullable: false,
  };
};

const buildRegistry = (fields: AvroField[]): Map<string, AvroRecordType> => {
  const reg = new Map<string, AvroRecordType>();
  const scan = (type: AvroType): void => {
    if (typeof type === 'string') return;
    if (Array.isArray(type)) {
      type.forEach(scan);
      return;
    }
    if (type.type === 'record') {
      reg.set(type.name, type);
      type.fields.forEach((f) => {
        scan(f.type);
      });
    }
  };
  fields.forEach((f) => {
    scan(f.type);
  });
  return reg;
};

const resolveRecord = (type: AvroType, reg: Map<string, AvroRecordType>): AvroRecordType | null => {
  if (typeof type === 'string') return reg.get(type) ?? null;
  if (Array.isArray(type)) {
    for (const t of type) {
      const r = resolveRecord(t, reg);
      if (r) return r;
    }
    return null;
  }
  return type.type === 'record' ? type : null;
};

const toRows = (
  fields: AvroField[],
  reg: Map<string, AvroRecordType>,
  seen = new Set<string>()
): FieldRow[] =>
  fields.map((f) => {
    const { label, nullable } = typeInfo(f.type);
    const nested = resolveRecord(f.type, reg);
    const children =
      nested && !seen.has(nested.name)
        ? toRows(nested.fields, reg, new Set([...seen, nested.name]))
        : undefined;
    return {
      name: f.name,
      type: label,
      required: !nullable && !('default' in f),
      doc: f.doc,
      children,
    };
  });

export const avroParser: SchemaParser = {
  canParse: (result: TopicSchemaResult) => result.source === 'apicurio',

  parse: (result: TopicSchemaResult): Extracted | null => {
    const reg = buildRegistry(result.fields);
    return { rows: toRows(result.fields, reg), section: result.name };
  },
};
