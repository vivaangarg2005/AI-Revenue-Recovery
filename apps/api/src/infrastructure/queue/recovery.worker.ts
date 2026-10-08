import { Worker, Job } from "bullmq";
import { getRedisClient } from "../redis/redis.js";
import { logger } from "../../utils/logger.js";
import { RecoveryService } from "../../domain/recovery/RecoveryService.js";

const QUEUE_NAME = "recovery-jobs";

export const recoveryWorker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    const { caseId, correlationId } = job.data;
    logger.info(`Worker starting job for case ${caseId}`, { correlationId, jobId: job.id });
    
    try {
      const result = await RecoveryService.runRecoveryWorkflow(caseId);
      logger.info(`Worker finished job for case ${caseId}`, { correlationId, result });
      return result;
    } catch (error: any) {
      if (error.code === "CASE_NOT_RUNNABLE") {
        logger.warn(`Worker skipped non-runnable case ${caseId}`, { correlationId });
        return; // Don't retry, it's a semantic rejection
      }
      logger.error(`Worker failed job for case ${caseId}`, { correlationId, error });
      throw error; // Will be caught by BullMQ for retries
    }
  },
  {
    connection: getRedisClient(),
    concurrency: 5,
  }
);

recoveryWorker.on("completed", (job) => {
  logger.info(`Job completed: ${job.id}`);
});

recoveryWorker.on("failed", (job, err) => {
  logger.error(`Job failed: ${job?.id}`, { error: err });
});
