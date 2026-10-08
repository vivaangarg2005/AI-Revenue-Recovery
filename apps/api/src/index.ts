import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./infrastructure/database/prisma.js";
import { getRedisClient } from "./infrastructure/redis/redis.js";
import { logger } from "./utils/logger.js";
import { setupSwagger } from "./config/swagger.js";
import "./infrastructure/queue/recovery.worker.js";

// Setup Swagger API Docs
setupSwagger(app);

const server = app.listen(env.PORT, () => {
  logger.info(
    `🚀 RECOVER-AI API Server listening on port ${env.PORT} [${env.NODE_ENV}]`,
  );
});

// Graceful Shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    logger.info("🔌 HTTP Server closed.");
    try {
      await prisma.$disconnect();
      logger.info("🐘 PostgreSQL connection closed.");
      const redis = getRedisClient();
      await redis.quit();
      logger.info("🔴 Redis connection closed.");
      process.exit(0);
    } catch (err) {
      logger.error("❌ Error during shutdown:", { error: err });
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
