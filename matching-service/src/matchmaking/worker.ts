/**
 * Long-running background worker that drains the match queue and runs orchestration.
 */
import { logger } from "@/shared/logger";
import { MatchJobQueueService } from "@/matchmaking/queue";
import { MatchOrchestratorService } from "@/matchmaking/orchestrator";

export class MatchWorkerService {
  private isRunning = false;

  constructor(
    private readonly queue = new MatchJobQueueService(),
    private readonly orchestrator = new MatchOrchestratorService(),
  ) {}

  /** Starts the worker loop exactly once. */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    void this.runLoop();
  }

  /** Signals the worker loop to stop after the current dequeue cycle. */
  stop(): void {
    this.isRunning = false;
  }

  /** Polls Redis queue and processes jobs with failure isolation per iteration. */
  private async runLoop(): Promise<void> {
    logger.info("Match worker started");
    while (this.isRunning) {
      try {
        const job = await this.queue.dequeue(2);
        if (!job) {
          continue;
        }
        await this.orchestrator.processMatchRequest(job);
      } catch (error) {
        logger.error("Match worker failed to process job", { error: String(error) });
      }
    }
    logger.info("Match worker stopped");
  }
}
