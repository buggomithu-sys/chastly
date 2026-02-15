import crypto from 'crypto';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export class MessageVariationEngine {
  // Apply spintax: {{Hi|Hello|Hey}} for variations, {name} for variables
  applySpintax(template: string): string {
    // Only match double braces for spintax: {{option1|option2}}
    const regex = /\{\{([^}]+)\}\}/g;

    return template.replace(regex, (match, options) => {
      const choices = options.split('|');
      return choices[Math.floor(Math.random() * choices.length)];
    });
  }

  // Generate variations using spintax
  generateVariations(template: string, count: number = 5): string[] {
    const variations: string[] = [];

    for (let i = 0; i < count; i++) {
      variations.push(this.applySpintax(template));
    }

    // Remove duplicates
    return Array.from(new Set(variations));
  }

  // Check for duplicate message (anti-spam)
  async checkDuplicate(
    userId: string,
    channel: string,
    message: string,
    timeWindow: number = 3600 // 1 hour
  ): Promise<boolean> {
    const hash = this.hashMessage(message);
    const key = `duplicate:${userId}:${channel}:${hash}`;

    const exists = await redis.exists(key);

    if (exists) {
      return true; // Duplicate found
    }

    // Store hash for time window
    await redis.setex(key, timeWindow, '1');

    return false;
  }

  // Hash message for duplicate detection
  private hashMessage(message: string): string {
    return crypto.createHash('sha256').update(message).digest('hex');
  }

  // Apply message variation for anti-spam
  async applyVariation(
    userId: string,
    channel: string,
    template: string
  ): Promise<string> {
    // First apply spintax
    let message = this.applySpintax(template);

    // Check if duplicate
    let attempts = 0;
    while (await this.checkDuplicate(userId, channel, message) && attempts < 10) {
      message = this.applySpintax(template);
      attempts++;
    }

    if (attempts >= 10) {
      console.warn('[Message Variation] Could not generate unique message after 10 attempts');
    }

    return message;
  }

  // Add random delay for human-like behavior (returns seconds)
  generateDelay(minSeconds: number, maxSeconds: number): number {
    // Use normal distribution for more realistic delays
    const mean = (minSeconds + maxSeconds) / 2;
    const stdDev = (maxSeconds - minSeconds) / 6;

    const delay = this.normalRandom(mean, stdDev);

    // Clamp to min/max
    return Math.max(minSeconds, Math.min(maxSeconds, Math.round(delay)));
  }

  // Box-Muller transform for normal distribution
  private normalRandom(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();

    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    return z0 * stdDev + mean;
  }

  // Time-of-day based delay adjustments
  getTimeBasedDelay(baseDelay: number): number {
    const hour = new Date().getHours();

    // Slower during business hours (more natural)
    if (hour >= 9 && hour <= 17) {
      return Math.round(baseDelay * 1.5); // 50% slower
    }

    // Faster during off-hours
    if (hour >= 0 && hour <= 6) {
      return Math.round(baseDelay * 0.7); // 30% faster
    }

    return baseDelay;
  }
}

export const messageVariationEngine = new MessageVariationEngine();
