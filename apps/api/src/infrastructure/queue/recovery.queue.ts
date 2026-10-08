import { Queue, Job } from "bullmq";
import { getRedisClient } from "../redis/redis.js";
import { logger } from "../../utils/logger.js";

const QUEUE_NAME = "recovery-jobs";

export const recoveryQueue = new Queue(QUEUE_NAME, {
  connection: getRedisClient(),
  defaultJobOptions: {
    attempts: 3, // Bounded retries for transient errors
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export interface RecoveryJobPayload {
  caseId: string;
  correlationId: string;
}

export async function enqueueRecoveryJob(caseId: string, correlationId: string): Promise<Job> {
  logger.info(`Enqueueing recovery job for case ${caseId}`);
  // Idempotency constraint: avoid duplicate enqueuing if active
  return recoveryQueue.add(
    "process-recovery", 
    { caseId, correlationId },
    { jobId: `recovery_${caseId}` } // Idempotency via jobId
  );
}
