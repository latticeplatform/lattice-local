import type { TopicSchemaResult } from './connect.ts';

export interface FieldRow {
  name: string;
  type: string;
  required: boolean;
  doc?: string;
  children?: FieldRow[];
}

export interface Extracted {
  rows: FieldRow[];
  section: string;
}

export interface SchemaParser {
  canParse(result: TopicSchemaResult): boolean;
  parse(result: TopicSchemaResult): Extracted | null;
}