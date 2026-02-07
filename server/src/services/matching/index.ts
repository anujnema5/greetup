import { getRedis } from "@/core/redis";
import { Socket } from "socket.io";

interface UserPreferences {
    interests?: string;
    age?: string;
    city?: string;
    personality?: string;
    lifestyle?: string;
    goals?: string;
    [key: string]: string | undefined;
}

interface MatchData {
    userA: string;
    userB: string;
    score: string;
    createdAt: string;
    status: 'active' | 'inactive' | 'completed';
}

interface MatchResult {
    userA: string;
    userB: string;
    score: number;
    scoreAtoB: number;
    scoreBtoA: number;
}

interface MatchingStatus {
    status: 'searching' | 'stopped' | 'matched';
    message: string;
    queuePosition?: number;
}

interface MatchNotification {
    type: 'match_found';
    matchId: string;
    score: string;
    timestamp: number;
    partnerId?: string;
}

interface QueueUpdate {
    queueSize: number;
    position: number;
    estimatedTime: string;
}

interface StartMatchingData {
    userId: string;
    preferences?: UserPreferences;
}

interface StopMatchingData {
    userId: string;
}

interface OperationResult {
    success: boolean;
    message?: string;
    error?: string;
}

const client = getRedis();

export class MatchEngine {
    private io: Socket;
    private readonly MATCH_QUEUE_KEY: string;
    private readonly USER_POOL_KEY: string;
    private readonly USER_SOCKETS_KEY: string;
    private readonly USER_PREFERENCES_KEY: string;
    private readonly MATCH_RESULTS_KEY: string;
    private readonly MATCHING_TIMEOUT: number;

    constructor(socketIO: Socket) {
        this.io = socketIO;
        this.MATCH_QUEUE_KEY = 'matching:queue';
        this.USER_POOL_KEY = 'matching:pool';
        this.USER_SOCKETS_KEY = 'user:sockets:';
        this.USER_PREFERENCES_KEY = 'user:preferences:';
        this.MATCH_RESULTS_KEY = 'match:results:';
        this.MATCHING_TIMEOUT = 30000;

        this.setupSocketHandlers();
    }

    private setupSocketHandlers(): void {
        this.io.on('connection', (socket) => {
            console.log('User connected:', socket.id);

            // User joins matching
            socket.on('start-matching', async (data: StartMatchingData) => {
                const { userId, preferences } = data;

                // Store socket mapping
                await client.set(`${this.USER_SOCKETS_KEY}${userId}`, socket.id);

                // Set user preferences
                if (preferences) {
                    await client.hset(`${this.USER_PREFERENCES_KEY}${userId}`, preferences as Record<string, string>);
                }

                // Add to matching queue
                const result: OperationResult = await this.startMatching(userId);

                const matchingStatus: MatchingStatus = {
                    status: 'searching',
                    message: 'Looking for matches...',
                    queuePosition: await this.getQueuePosition(userId)
                };

                socket.emit('matching-status', matchingStatus);
            });

            // User stops matching
            socket.on('stop-matching', async (data: StopMatchingData) => {
                const { userId } = data;
                await this.stopMatching(userId);
                await client.del(`${this.USER_SOCKETS_KEY}${userId}`);

                const matchingStatus: MatchingStatus = {
                    status: 'stopped',
                    message: 'Matching stopped'
                };

                socket.emit('matching-status', matchingStatus);
            });

            // Handle disconnect
            socket.on('disconnect', async () => {
                // Find user by socket ID and remove from queue
                const keys: string[] = await client.keys(`${this.USER_SOCKETS_KEY}*`);
                for (const key of keys) {
                    const socketId: string | null = await client.get(key);
                    if (socketId === socket.id) {
                        const userId: string = key.replace(this.USER_SOCKETS_KEY, '');
                        await this.stopMatching(userId);
                        await client.del(key);
                        break;
                    }
                }
                console.log('User disconnected:', socket.id);
            });
        });
    }

    private async startMatching(userId: string): Promise<OperationResult> {
        try {
            // Add user to matching queue
            await client.zadd(this.MATCH_QUEUE_KEY, Date.now(), userId);
            await client.sadd(this.USER_POOL_KEY, userId);

            console.log(`User ${userId} added to matching queue`);

            // Notify about queue update
            await this.broadcastQueueUpdate();

            // Try to find matches immediately
            setTimeout(() => this.processMatching(), 1000);

            return { success: true, message: "Added to matching queue" };
        } catch (error: any) {
            console.error('Error starting matching:', error);
            return { success: false, error: error.message };
        }
    }

    private async stopMatching(userId: string): Promise<OperationResult> {
        try {
            await client.zrem(this.MATCH_QUEUE_KEY, userId);
            await client.srem(this.USER_POOL_KEY, userId);
            await client.del(`${this.MATCH_RESULTS_KEY}${userId}`);

            await this.broadcastQueueUpdate();
            return { success: true };
        } catch (error: any) {
            console.error('Error stopping matching:', error);
            return { success: false, error: error.message };
        }
    }

    private async processMatching(): Promise<void> {
        try {
            const waitingUsers: string[] = await client.smembers(this.USER_POOL_KEY);

            if (waitingUsers.length < 2) {
                console.log('Not enough users for matching');
                return;
            }

            console.log(`Processing matching for ${waitingUsers.length} users`);

            // Get all user preferences
            const userPreferences: Record<string, UserPreferences> = {};
            for (const userId of waitingUsers) {
                const prefs: UserPreferences = await client.hgetall(`${this.USER_PREFERENCES_KEY}${userId}`);
                userPreferences[userId] = prefs;
            }

            // Find mutual matches
            const matches: MatchResult[] = await this.findMutualMatches(waitingUsers, userPreferences);

            // Process matches
            for (const match of matches) {
                await this.createMatch(match.userA, match.userB, match.score);
            }

        } catch (error: any) {
            console.error('Error in processMatching:', error);
        }
    }

    private calculateMatchScore(
        userA: string, 
        userB: string, 
        userAPrefs: UserPreferences, 
        userBPrefs: UserPreferences
    ): number {
        let score: number = 0;
        let factors: number = 0;

        // Interest matching
        const userAInterests: string[] = (userAPrefs.interests || '').split(',').filter(i => i.trim());
        const userBInterests: string[] = (userBPrefs.interests || '').split(',').filter(i => i.trim());

        if (userAInterests.length && userBInterests.length) {
            const commonInterests: string[] = userAInterests.filter(interest =>
                userBInterests.some(bInterest =>
                    bInterest.toLowerCase().trim() === interest.toLowerCase().trim()
                )
            );
            const interestScore: number = (commonInterests.length / Math.max(userAInterests.length, userBInterests.length)) * 100;
            score += interestScore * 0.4;
            factors++;
        }

        // Age compatibility
        const ageA: number = parseInt(userAPrefs.age || '25') || 25;
        const ageB: number = parseInt(userBPrefs.age || '25') || 25;
        const ageDiff: number = Math.abs(ageA - ageB);
        const ageScore: number = Math.max(0, 100 - (ageDiff * 5));
        score += ageScore * 0.2;
        factors++;

        // Location proximity
        if (userAPrefs.city && userBPrefs.city) {
            const locationScore: number = userAPrefs.city.toLowerCase() === userBPrefs.city.toLowerCase() ? 100 : 60;
            score += locationScore * 0.2;
            factors++;
        }

        // Personality compatibility
        const personalityFactors: (keyof UserPreferences)[] = ['personality', 'lifestyle', 'goals'];
        personalityFactors.forEach(factor => {
            if (userAPrefs[factor] && userBPrefs[factor]) {
                const compatibility: number = userAPrefs[factor]!.toLowerCase() === userBPrefs[factor]!.toLowerCase() ? 100 : 50;
                score += compatibility * 0.2;
                factors++;
            }
        });

        return factors > 0 ? score / factors : 0;
    }

    private async findMutualMatches(
        users: string[], 
        userPreferences: Record<string, UserPreferences>
    ): Promise<MatchResult[]> {
        const mutualMatches: MatchResult[] = [];
        const used: Set<string> = new Set();

        // Calculate all pairwise scores
        const scores: MatchResult[] = [];
        for (let i = 0; i < users.length; i++) {
            for (let j = i + 1; j < users.length; j++) {
                const userA: string = users[i];
                const userB: string = users[j];

                const scoreAtoB: number = this.calculateMatchScore(userA, userB, userPreferences[userA], userPreferences[userB]);
                const scoreBtoA: number = this.calculateMatchScore(userB, userA, userPreferences[userB], userPreferences[userA]);

                // Use minimum score for mutual compatibility
                const mutualScore: number = Math.min(scoreAtoB, scoreBtoA);

                if (mutualScore >= 65) {
                    scores.push({
                        userA, userB, score: mutualScore,
                        scoreAtoB, scoreBtoA
                    });
                }
            }
        }

        // Sort by mutual score
        scores.sort((a, b) => b.score - a.score);

        // Greedy matching - highest mutual scores first
        for (const match of scores) {
            if (!used.has(match.userA) && !used.has(match.userB)) {
                mutualMatches.push(match);
                used.add(match.userA);
                used.add(match.userB);
            }
        }

        return mutualMatches;
    }

    private async createMatch(userA: string, userB: string, score: number): Promise<void> {
        const matchId: string = `match_${userA}_${userB}_${Date.now()}`;
        const matchData: MatchData = {
            userA, userB,
            score: score.toFixed(2),
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        // Store match
        await client.hset(`match:${matchId}`, matchData);

        // Remove from queue
        await client.srem(this.USER_POOL_KEY, userA, userB);
        await client.zrem(this.MATCH_QUEUE_KEY, userA, userB);

        // Send real-time notifications
        await this.notifyMatchFound(userA, userB, matchId, score);

        // Update queue for remaining users
        await this.broadcastQueueUpdate();

        console.log(`Match created: ${userA} <-> ${userB} (${score.toFixed(2)}%)`);
    }

    private async notifyMatchFound(
        userA: string, 
        userB: string, 
        matchId: string, 
        score: number
    ): Promise<void> {
        // Get socket IDs
        const socketA: string | null = await client.get(`${this.USER_SOCKETS_KEY}${userA}`);
        const socketB: string | null = await client.get(`${this.USER_SOCKETS_KEY}${userB}`);

        const matchNotification: Omit<MatchNotification, 'partnerId'> = {
            type: 'match_found',
            matchId,
            score: score.toFixed(2),
            timestamp: Date.now()
        };

        // Send to both users instantly
        if (socketA) {
            const notificationA: MatchNotification = {
                ...matchNotification,
                partnerId: userB
            };
            this.io.to(socketA).emit('match-found', notificationA);
        }

        if (socketB) {
            const notificationB: MatchNotification = {
                ...matchNotification,
                partnerId: userA
            };
            this.io.to(socketB).emit('match-found', notificationB);
        }
    }

    private async broadcastQueueUpdate(): Promise<void> {
        const queueSize: number = await client.scard(this.USER_POOL_KEY);
        const waitingUsers: string[] = await client.smembers(this.USER_POOL_KEY);

        // Send queue updates to all waiting users
        for (const userId of waitingUsers) {
            const socketId: string | null = await client.get(`${this.USER_SOCKETS_KEY}${userId}`);
            if (socketId) {
                const position: number = await this.getQueuePosition(userId);
                const queueUpdate: QueueUpdate = {
                    queueSize,
                    position,
                    estimatedTime: this.getEstimatedWaitTime(queueSize)
                };
                this.io.to(socketId).emit('queue-update', queueUpdate);
            }
        }
    }

    private async getQueuePosition(userId: string): Promise<number> {
        const timestamp: string | null = await client.zscore(this.MATCH_QUEUE_KEY, userId);
        if (!timestamp) return -1;

        const timestampNum: number = parseFloat(timestamp);
        const earlierUsers: number = await client.zcount(this.MATCH_QUEUE_KEY, 0, timestampNum - 1);
        return earlierUsers + 1;
    }

    private getEstimatedWaitTime(queueSize: number): string {
        if (queueSize < 2) return 'Waiting for more users...';
        if (queueSize < 5) return '~10 seconds';
        if (queueSize < 10) return '~30 seconds';
        return '~1 minute';
    }
}