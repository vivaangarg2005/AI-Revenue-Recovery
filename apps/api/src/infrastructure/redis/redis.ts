import { Redis } from "ioredis";
import { env } from "../../config/env.js";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 100, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on("error", (err) => {
      console.error("⚠️ Redis Client Error:", err.message);
    });
  }
  return redisClient;
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient();
    if (client.status !== "ready" && client.status !== "connecting") {
      await client.connect();
    }
    const pong = await client.ping();
    return pong === "PONG";
  } catch (err) {
    return false;
  }
}
