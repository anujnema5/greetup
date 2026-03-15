import { logger } from "@/core/logger";
import { MatchJobQueueService } from "@/matchmaking/infrastructure/services/match-job-queue.service";
import { MatchOrchestratorService } from "@/matchmaking/application/match-orchestrator.service";

export class MatchWorkerService {
  private isRunning = false;

  constructor(
    private readonly queue = new MatchJobQueueService(),
    private readonly orchestrator = new MatchOrchestratorService(),
  ) {}

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    void this.runLoop();
  }

  stop(): void {
    this.isRunning = false;
  }

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
