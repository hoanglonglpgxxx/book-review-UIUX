import Redis from "ioredis";

declare global {
  var redisClient: Redis | undefined;
}

export function getRedisClient() {
  if (global.redisClient) {
    return global.redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("Missing REDIS_URL in environment.");
  }

  global.redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
  });

  return global.redisClient;
}
