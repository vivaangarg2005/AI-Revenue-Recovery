import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./infrastructure/database/prisma.js";
import { getRedisClient } from "./infrastructure/redis/redis.js";

const server = app.listen(env.PORT, () => {
  console.log(`🚀 RECOVER-AI API Server listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

// Graceful Shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log("🔌 HTTP Server closed.");
    try {
      await prisma.$disconnect();
      console.log("🐘 PostgreSQL connection closed.");
      const redis = getRedisClient();
      await redis.quit();
      console.log("🔴 Redis connection closed.");
      process.exit(0);
    } catch (err) {
      console.error("❌ Error during shutdown:", err);
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
