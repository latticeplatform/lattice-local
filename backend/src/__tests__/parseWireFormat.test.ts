import { describe, it, expect } from 'vitest';
import { parseWireFormat } from '../utils/index.js';

const wireBuffer = (schemaId: number, payload: Buffer): Buffer => {
  const buf = Buffer.alloc(5 + payload.length);
  buf[0] = 0x00;
  buf.writeInt32BE(schemaId, 1);
  payload.copy(buf, 5);
  return buf;
};

describe('parseWireFormat', () => {
  it('returns null for an empty buffer', () => {
    expect(parseWireFormat(Buffer.alloc(0))).toBeNull();
  });

  it('returns null for a buffer shorter than 5 bytes', () => {
    expect(parseWireFormat(Buffer.alloc(4))).toBeNull();
  });

  it('returns null when the magic byte is not 0x00', () => {
    const buf = Buffer.alloc(10);
    buf[0] = 0x01;
    expect(parseWireFormat(buf)).toBeNull();
  });

  it('extracts the schema ID from bytes 1–4', () => {
    const result = parseWireFormat(wireBuffer(42, Buffer.from('payload')));
    expect(result?.schemaId).toBe(42);
  });

  it('extracts the payload starting at byte 5', () => {
    const payload = Buffer.from('hello world');
    const result = parseWireFormat(wireBuffer(1, payload));
    expect(result?.payload).toEqual(payload);
  });

  it('handles a 5-byte buffer with an empty payload', () => {
    const result = parseWireFormat(wireBuffer(99, Buffer.alloc(0)));
    expect(result?.schemaId).toBe(99);
    expect(result?.payload.length).toBe(0);
  });

  it('handles large schema IDs correctly', () => {
    const result = parseWireFormat(wireBuffer(2_147_483_647, Buffer.from('x')));
    expect(result?.schemaId).toBe(2_147_483_647);
  });
});