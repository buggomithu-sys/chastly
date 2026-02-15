import { prisma } from './prisma';
import { Channel } from '@prisma/client';

export class ReputationManager {
  // Calculate reputation score based on metrics
  calculateReputationScore(metrics: {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalBlocked: number;
    spamComplaints: number;
    bounceRate?: number;
  }): number {
    const {
      totalSent,
      totalDelivered,
      totalFailed,
      totalBlocked,
      spamComplaints,
      bounceRate = 0,
    } = metrics;

    if (totalSent === 0) return 100;

    // Base score: delivery rate
    const deliveryRate = totalDelivered / totalSent;
    let score = deliveryRate * 100;

    // Penalize failures
    const failureRate = totalFailed / totalSent;
    score -= failureRate * 30;

    // Heavy penalty for blocks
    const blockRate = totalBlocked / totalSent;
    score -= blockRate * 50;

    // Heavy penalty for spam complaints
    const spamRate = spamComplaints / totalSent;
    score -= spamRate * 100;

    // Email-specific: bounce rate
    if (bounceRate) {
      score -= bounceRate * 40;
    }

    // Ensure score is within 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // Update reputation after sending a message
  async updateReputation(
    userId: string,
    channel: Channel,
    identifier: string, // phone number, domain, sender ID
    event: 'sent' | 'delivered' | 'failed' | 'blocked' | 'spam'
  ): Promise<void> {
    const reputation = await this.getOrCreateReputation(userId, channel, identifier);

    // Update metrics
    switch (event) {
      case 'sent':
        reputation.totalSent++;
        break;
      case 'delivered':
        reputation.totalDelivered++;
        break;
      case 'failed':
        reputation.totalFailed++;
        break;
      case 'blocked':
        reputation.totalBlocked++;
        break;
      case 'spam':
        reputation.spamComplaints++;
        break;
    }

    // Recalculate score
    reputation.reputationScore = this.calculateReputationScore(reputation);

    // Update last sent timestamp
    if (event === 'sent') {
      reputation.lastSentAt = new Date();
    }

    await prisma.channelReputation.update({
      where: { id: reputation.id },
      data: reputation,
    });

    // Check if campaign should be paused
    await this.checkAndPauseCampaigns(userId, channel, reputation);
  }

  // Get or create reputation record
  private async getOrCreateReputation(
    userId: string,
    channel: Channel,
    identifier: string
  ) {
    let reputation = await prisma.channelReputation.findUnique({
      where: {
        userId_channel_identifier: {
          userId,
          channel,
          identifier,
        },
      },
    });

    if (!reputation) {
      reputation = await prisma.channelReputation.create({
        data: {
          userId,
          channel,
          identifier,
          reputationScore: 100,
          warmupPhase: true,
        },
      });
    }

    return reputation;
  }

  // Check and pause campaigns if reputation is too low
  private async checkAndPauseCampaigns(
    userId: string,
    channel: Channel,
    reputation: any
  ): Promise<void> {
    const threshold = parseInt(process.env.DEFAULT_REPUTATION_THRESHOLD || '70');

    if (reputation.reputationScore < threshold) {
      // Pause all running campaigns on this channel
      const campaigns = await prisma.campaign.findMany({
        where: {
          userId,
          channel,
          status: 'RUNNING',
        },
      });

      for (const campaign of campaigns) {
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { status: 'PAUSED' },
        });

        console.log(
          `[Reputation] Paused campaign ${campaign.id} due to low reputation (${reputation.reputationScore})`
        );
      }

      // Log alert (in production, send notification to user)
      console.log(
        `[Reputation] WARNING: ${channel} reputation for user ${userId} is ${reputation.reputationScore}`
      );
    }
  }

  // Get warmup limit for new accounts
  async getWarmupLimit(reputation: any): Promise<number> {
    if (!reputation.warmupPhase) {
      return Infinity; // No limit if not in warmup
    }

    const daysSinceCreation = Math.floor(
      (Date.now() - reputation.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Warmup schedule
    const warmupSchedule = [
      { day: 1, maxMessages: 10 },
      { day: 2, maxMessages: 20 },
      { day: 3, maxMessages: 30 },
      { day: 5, maxMessages: 50 },
      { day: 7, maxMessages: 100 },
      { day: 10, maxMessages: 200 },
      { day: 14, maxMessages: 400 },
      { day: 21, maxMessages: 800 },
      { day: 30, maxMessages: 1000 },
    ];

    let limit = warmupSchedule[0].maxMessages;

    for (const schedule of warmupSchedule) {
      if (daysSinceCreation >= schedule.day) {
        limit = schedule.maxMessages;
      } else {
        break;
      }
    }

    return limit;
  }

  // Check if warmup should be completed
  async checkWarmupCompletion(reputation: any): Promise<void> {
    if (!reputation.warmupPhase) return;

    const daysSinceCreation = Math.floor(
      (Date.now() - reputation.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Complete warmup after 30 days with good reputation
    if (daysSinceCreation >= 30 && reputation.reputationScore >= 80) {
      await prisma.channelReputation.update({
        where: { id: reputation.id },
        data: { warmupPhase: false },
      });

      console.log(
        `[Reputation] Warmup completed for ${reputation.channel} (user: ${reputation.userId})`
      );
    }
  }

  // Get reputation for a channel
  async getReputation(userId: string, channel: Channel, identifier: string) {
    return await this.getOrCreateReputation(userId, channel, identifier);
  }

  // Get all reputations for a user
  async getUserReputations(userId: string) {
    return await prisma.channelReputation.findMany({
      where: { userId },
      orderBy: { reputationScore: 'desc' },
    });
  }
}

export const reputationManager = new ReputationManager();
