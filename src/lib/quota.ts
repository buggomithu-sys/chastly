import { prisma } from './prisma';
import { Channel } from '@prisma/client';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface QuotaLimits {
  dailyQuota: number;
  hourlyQuota?: number;
  perMinuteQuota?: number;
}

export class QuotaManager {
  // Check if user can send a message
  async checkQuota(
    userId: string,
    channel: Channel
  ): Promise<{ allowed: boolean; reason?: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { allowed: false, reason: 'User not found' };
    }

    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const currentHour = now.getHours();
    const currentMinute = Math.floor(Date.now() / 60000); // Minute timestamp

    // Get quota limits
    const limits = this.getQuotaLimits(user, channel);

    // Check daily quota
    const dailyUsage = await this.getDailyUsage(userId, channel, today);
    if (dailyUsage >= limits.dailyQuota) {
      return {
        allowed: false,
        reason: `Daily quota exceeded (${dailyUsage}/${limits.dailyQuota})`,
      };
    }

    // Check hourly quota if set
    if (limits.hourlyQuota) {
      const hourlyUsage = await this.getHourlyUsage(userId, channel, today, currentHour);
      if (hourlyUsage >= limits.hourlyQuota) {
        return {
          allowed: false,
          reason: `Hourly quota exceeded (${hourlyUsage}/${limits.hourlyQuota})`,
        };
      }
    }

    // Check per-minute quota if set
    if (limits.perMinuteQuota) {
      const minuteUsage = await this.getMinuteUsage(userId, channel, currentMinute);
      if (minuteUsage >= limits.perMinuteQuota) {
        return {
          allowed: false,
          reason: `Per-minute quota exceeded (${minuteUsage}/${limits.perMinuteQuota})`,
        };
      }
    }

    return { allowed: true };
  }

  // Increment quota usage
  async incrementQuota(userId: string, channel: Channel): Promise<void> {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const hourSlot = now.getHours();
    const currentMinute = Math.floor(Date.now() / 60000);

    // Increment in database
    await prisma.quotaTracking.upsert({
      where: {
        userId_channel_date_hourSlot: {
          userId,
          channel,
          date: today,
          hourSlot,
        },
      },
      update: {
        count: {
          increment: 1,
        },
      },
      create: {
        userId,
        channel,
        date: today,
        hourSlot,
        count: 1,
      },
    });

    // Increment in Redis for real-time tracking
    const dailyKey = `quota:${userId}:${channel}:daily:${today.toISOString().split('T')[0]}`;
    const hourlyKey = `quota:${userId}:${channel}:hourly:${today.toISOString().split('T')[0]}:${hourSlot}`;
    const minuteKey = `quota:${userId}:${channel}:minute:${currentMinute}`;

    await redis.incr(dailyKey);
    await redis.incr(hourlyKey);
    await redis.incr(minuteKey);

    // Set TTL
    await redis.expire(dailyKey, 86400); // 24 hours
    await redis.expire(hourlyKey, 3600); // 1 hour
    await redis.expire(minuteKey, 120); // 2 minutes
  }

  // Get quota limits for user and channel
  private getQuotaLimits(user: any, channel: Channel): QuotaLimits {
    // Base limits from user plan
    const baseLimits: Record<string, QuotaLimits> = {
      FREE: { dailyQuota: 100, hourlyQuota: 20, perMinuteQuota: 5 },
      STARTER: { dailyQuota: 1000, hourlyQuota: 100, perMinuteQuota: 10 },
      PRO: { dailyQuota: 10000, hourlyQuota: 500, perMinuteQuota: 50 },
      ENTERPRISE: { dailyQuota: 100000, hourlyQuota: 5000, perMinuteQuota: 500 },
    };

    return baseLimits[user.plan] || baseLimits.FREE;
  }

  // Get daily usage
  private async getDailyUsage(
    userId: string,
    channel: Channel,
    date: Date
  ): Promise<number> {
    const dateStr = date.toISOString().split('T')[0];
    const key = `quota:${userId}:${channel}:daily:${dateStr}`;
    const cached = await redis.get(key);

    if (cached) {
      return parseInt(cached);
    }

    // Fallback to database
    const records = await prisma.quotaTracking.findMany({
      where: { userId, channel, date },
    });

    return records.reduce((sum, r) => sum + r.count, 0);
  }

  // Get hourly usage
  private async getHourlyUsage(
    userId: string,
    channel: Channel,
    date: Date,
    hour: number
  ): Promise<number> {
    const dateStr = date.toISOString().split('T')[0];
    const key = `quota:${userId}:${channel}:hourly:${dateStr}:${hour}`;
    const cached = await redis.get(key);

    if (cached) {
      return parseInt(cached);
    }

    // Fallback to database
    const record = await prisma.quotaTracking.findUnique({
      where: {
        userId_channel_date_hourSlot: {
          userId,
          channel,
          date,
          hourSlot: hour,
        },
      },
    });

    return record?.count || 0;
  }

  // Get per-minute usage
  private async getMinuteUsage(
    userId: string,
    channel: Channel,
    minute: number
  ): Promise<number> {
    const key = `quota:${userId}:${channel}:minute:${minute}`;
    const cached = await redis.get(key);

    return cached ? parseInt(cached) : 0;
  }

  // Get quota statistics
  async getQuotaStats(userId: string, channel?: Channel) {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));

    const where: any = {
      userId,
      date: today,
    };

    if (channel) {
      where.channel = channel;
    }

    const records = await prisma.quotaTracking.findMany({
      where,
    });

    const stats: Record<string, number> = {};

    for (const record of records) {
      if (!stats[record.channel]) {
        stats[record.channel] = 0;
      }
      stats[record.channel] += record.count;
    }

    return stats;
  }
}

export const quotaManager = new QuotaManager();
