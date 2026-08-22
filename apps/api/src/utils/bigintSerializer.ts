/**
 * Recursively converts BigInt values to string representation for safe JSON serialization.
 * Does NOT alter global BigInt.prototype to prevent side-effects.
 */
export function serializeBigInt<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "bigint") {
    return obj.toString() as unknown as T;
  }

  if (obj instanceof Date) {
    return obj as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeBigInt(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    const res: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      res[key] = serializeBigInt(value);
    }
    return res as T;
  }

  return obj;
}
