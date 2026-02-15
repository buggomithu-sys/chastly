# Anti-Ban & Anti-Spam Algorithm Design

## Overview
The Anti-Ban system is critical for maintaining sender reputation and preventing account blocks across WhatsApp, Email, SMS, and other channels. This document details the algorithms and strategies used.

## Core Principles

1. **Human-Like Behavior**: Mimic natural human sending patterns
2. **Reputation Management**: Track and maintain channel-specific reputation scores
3. **Progressive Warmup**: Gradually increase sending volume for new accounts
4. **Message Variation**: Avoid duplicate content detection
5. **Multi-Channel Fallback**: Route through alternative channels on failures
6. **Adaptive Throttling**: Adjust rate limits based on success metrics

## Components

### 1. Quota Management System

#### Multi-Level Quotas
```typescript
interface QuotaLimits {
  // User-defined limits
  dailyQuota: number;
  hourlyQuota?: number;
  perMinuteQuota?: number;
  
  // Admin-enforced limits (based on plan)
  maxDailyQuota: number;
  maxHourlyQuota: number;
  maxPerMinuteQuota: number;
  
  // Per-campaign overrides
  campaignDailyLimit?: number;
  campaignHourlyLimit?: number;
}

interface QuotaUsage {
  userId: string;
  channel: Channel;
  date: Date;
  hourSlot: number; // 0-23
  count: number;
}
```

#### Quota Tracking Algorithm
```typescript
class QuotaManager {
  async checkQuota(
    userId: string,
    channel: Channel
  ): Promise<{ allowed: boolean; reason?: string }> {
    const user = await getUser(userId);
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const currentHour = now.getHours();
    const currentMinute = Math.floor(now.getMinutes());
    
    // Get quota limits
    const limits = this.getQuotaLimits(user, channel);
    
    // Check daily quota
    const dailyUsage = await this.getDailyUsage(userId, channel, today);
    if (dailyUsage >= limits.dailyQuota) {
      return {
        allowed: false,
        reason: `Daily quota exceeded (${dailyUsage}/${limits.dailyQuota})`
      };
    }
    
    // Check hourly quota (if set)
    if (limits.hourlyQuota) {
      const hourlyUsage = await this.getHourlyUsage(
        userId,
        channel,
        today,
        currentHour
      );
      if (hourlyUsage >= limits.hourlyQuota) {
        return {
          allowed: false,
          reason: `Hourly quota exceeded (${hourlyUsage}/${limits.hourlyQuota})`
        };
      }
    }
    
    // Check per-minute quota (if set)
    if (limits.perMinuteQuota) {
      const minuteUsage = await this.getMinuteUsage(
        userId,
        channel,
        currentMinute
      );
      if (minuteUsage >= limits.perMinuteQuota) {
        return {
          allowed: false,
          reason: `Per-minute quota exceeded (${minuteUsage}/${limits.perMinuteQuota})`
        };
      }
    }
    
    return { allowed: true };
  }
  
  async incrementQuota(userId: string, channel: Channel): Promise<void> {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const hourSlot = now.getHours();
    
    // Increment in database
    await upsertQuotaTracking({
      userId,
      channel,
      date: today,
      hourSlot
    });
    
    // Increment in Redis for real-time tracking
    const dailyKey = `quota:${userId}:${channel}:daily:${today.toISOString()}`;
    const hourlyKey = `quota:${userId}:${channel}:hourly:${today.toISOString()}:${hourSlot}`;
    const minuteKey = `quota:${userId}:${channel}:minute:${Date.now()}`;
    
    await redis.incr(dailyKey);
    await redis.incr(hourlyKey);
    await redis.incr(minuteKey);
    
    // Set TTL
    await redis.expire(dailyKey, 86400); // 24 hours
    await redis.expire(hourlyKey, 3600); // 1 hour
    await redis.expire(minuteKey, 60); // 1 minute
  }
  
  private async getDailyUsage(
    userId: string,
    channel: Channel,
    date: Date
  ): Promise<number> {
    const key = `quota:${userId}:${channel}:daily:${date.toISOString()}`;
    const cached = await redis.get(key);
    
    if (cached) {
      return parseInt(cached);
    }
    
    // Fallback to database
    const records = await prisma.quotaTracking.findMany({
      where: { userId, channel, date }
    });
    
    return records.reduce((sum, r) => sum + r.count, 0);
  }
}
```

### 2. Reputation Scoring System

#### Reputation Metrics
```typescript
interface ReputationMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalBlocked: number;
  spamComplaints: number;
  bounceRate: number;
  reputationScore: number; // 0-100
}

interface ReputationThresholds {
  excellent: 90;
  good: 75;
  warning: 60;
  critical: 40;
}
```

#### Reputation Score Calculation
```typescript
class ReputationManager {
  calculateReputationScore(metrics: ReputationMetrics): number {
    const {
      totalSent,
      totalDelivered,
      totalFailed,
      totalBlocked,
      spamComplaints
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
    if (metrics.bounceRate) {
      score -= metrics.bounceRate * 40;
    }
    
    // Ensure score is within 0-100
    return Math.max(0, Math.min(100, score));
  }
  
  async updateReputation(
    userId: string,
    channel: Channel,
    identifier: string, // phone number, domain, sender ID
    event: 'sent' | 'delivered' | 'failed' | 'blocked' | 'spam'
  ): Promise<void> {
    const reputation = await this.getOrCreateReputation(
      userId,
      channel,
      identifier
    );
    
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
    
    await saveReputation(reputation);
    
    // Check if campaign should be paused
    await this.checkAndPauseCampaigns(userId, channel, reputation);
  }
  
  private async checkAndPauseCampaigns(
    userId: string,
    channel: Channel,
    reputation: ChannelReputation
  ): Promise<void> {
    const threshold = parseInt(process.env.DEFAULT_REPUTATION_THRESHOLD || '70');
    
    if (reputation.reputationScore < threshold) {
      // Pause all running campaigns on this channel
      await pauseCampaignsByChannel(userId, channel);
      
      // Send alert to user
      await sendAlert(userId, {
        type: 'reputation_low',
        channel,
        score: reputation.reputationScore,
        message: `Your ${channel} reputation score is ${reputation.reputationScore}. Campaigns have been paused.`
      });
    }
  }
}
```

### 3. Message Variation Engine

#### Spintax Processing
```typescript
class MessageVariationEngine {
  // Spintax: {Hi|Hello|Hey} {name}!
  applySpintax(template: string): string {
    const regex = /\{([^}]+)\}/g;
    
    return template.replace(regex, (match, options) => {
      const choices = options.split('|');
      return choices[Math.floor(Math.random() * choices.length)];
    });
  }
  
  // AI-based paraphrasing
  async aiParaphrase(message: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      return message;
    }
    
    const prompt = `
      Paraphrase the following message while keeping the same meaning.
      Make it sound natural and human-like.
      Keep it concise and maintain any template variables like {name}.
      
      Original: ${message}
      
      Paraphrased:
    `;
    
    try {
      const response = await callOpenAI(prompt, {
        temperature: 0.7,
        max_tokens: 200
      });
      
      return response.trim();
    } catch (error) {
      console.error('AI paraphrase failed:', error);
      return message;
    }
  }
  
  async generateVariations(
    template: string,
    count: number = 5
  ): Promise<string[]> {
    const variations: string[] = [];
    
    // Method 1: Spintax variations
    for (let i = 0; i < Math.ceil(count / 2); i++) {
      variations.push(this.applySpintax(template));
    }
    
    // Method 2: AI paraphrasing
    if (process.env.ENABLE_AI_PARAPHRASING === 'true') {
      for (let i = 0; i < Math.floor(count / 2); i++) {
        const paraphrased = await this.aiParaphrase(template);
        variations.push(paraphrased);
      }
    }
    
    // Remove duplicates
    return Array.from(new Set(variations));
  }
  
  // Duplicate detection
  async checkDuplicate(
    userId: string,
    channel: Channel,
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
  
  private hashMessage(message: string): string {
    // Simple hash for duplicate detection
    return crypto.createHash('sha256').update(message).digest('hex');
  }
}
```

### 4. Delay & Throttling System

#### Non-Linear Human-Like Delays
```typescript
class DelayManager {
  // Generate human-like random delay
  generateDelay(minSeconds: number, maxSeconds: number): number {
    // Use normal distribution for more realistic delays
    const mean = (minSeconds + maxSeconds) / 2;
    const stdDev = (maxSeconds - minSeconds) / 6;
    
    const delay = this.normalRandom(mean, stdDev);
    
    // Clamp to min/max
    return Math.max(minSeconds, Math.min(maxSeconds, delay));
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
      return baseDelay * 1.5; // 50% slower
    }
    
    // Faster during off-hours
    if (hour >= 0 && hour <= 6) {
      return baseDelay * 0.7; // 30% faster
    }
    
    return baseDelay;
  }
  
  // Non-linear burst prevention
  async preventBurst(
    userId: string,
    channel: Channel,
    count: number
  ): Promise<number> {
    // Get recent send rate
    const recentSends = await this.getRecentSendCount(userId, channel, 300); // 5 min
    
    // If sending too fast, add exponential delay
    if (recentSends > 10) {
      const burstFactor = Math.pow(1.5, recentSends - 10);
      return 60 * burstFactor; // Exponential backoff
    }
    
    return 0;
  }
}
```

### 5. Warmup Mode

#### Progressive Warmup Algorithm
```typescript
class WarmupManager {
  // Warmup schedule for new accounts
  private warmupSchedule = [
    { day: 1, maxMessages: 10 },
    { day: 2, maxMessages: 20 },
    { day: 3, maxMessages: 30 },
    { day: 5, maxMessages: 50 },
    { day: 7, maxMessages: 100 },
    { day: 10, maxMessages: 200 },
    { day: 14, maxMessages: 400 },
    { day: 21, maxMessages: 800 },
    { day: 30, maxMessages: 1000 }
  ];
  
  async getWarmupLimit(
    reputation: ChannelReputation
  ): Promise<number> {
    if (!reputation.warmupPhase) {
      return Infinity; // No limit if not in warmup
    }
    
    const daysSinceCreation = Math.floor(
      (Date.now() - reputation.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Find appropriate limit
    let limit = this.warmupSchedule[0].maxMessages;
    
    for (const schedule of this.warmupSchedule) {
      if (daysSinceCreation >= schedule.day) {
        limit = schedule.maxMessages;
      } else {
        break;
      }
    }
    
    return limit;
  }
  
  async checkWarmupCompletion(
    reputation: ChannelReputation
  ): Promise<void> {
    if (!reputation.warmupPhase) return;
    
    const daysSinceCreation = Math.floor(
      (Date.now() - reputation.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Complete warmup after 30 days with good reputation
    if (daysSinceCreation >= 30 && reputation.reputationScore >= 80) {
      reputation.warmupPhase = false;
      await saveReputation(reputation);
      
      await sendAlert(reputation.userId, {
        type: 'warmup_completed',
        channel: reputation.channel,
        message: `Warmup completed for ${reputation.channel}. Full quota available.`
      });
    }
  }
}
```

### 6. Multi-Channel Fallback

#### Fallback Routing Algorithm
```typescript
class FallbackRouter {
  private channelPriority: Channel[] = [
    Channel.WHATSAPP,
    Channel.EMAIL,
    Channel.SMS,
    Channel.TELEGRAM
  ];
  
  async sendWithFallback(
    userId: string,
    contact: Contact,
    message: string,
    preferredChannel: Channel
  ): Promise<SendResult> {
    const channels = this.getAvailableChannels(contact, preferredChannel);
    
    for (const channel of channels) {
      // Check reputation
      const reputation = await this.getReputation(userId, channel);
      
      if (reputation.reputationScore < 60) {
        console.log(`Skipping ${channel} due to low reputation`);
        continue;
      }
      
      // Check quota
      const quotaCheck = await quotaManager.checkQuota(userId, channel);
      
      if (!quotaCheck.allowed) {
        console.log(`Skipping ${channel} due to quota: ${quotaCheck.reason}`);
        continue;
      }
      
      // Attempt to send
      try {
        const result = await this.sendMessage(channel, contact, message);
        
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.error(`Failed to send via ${channel}:`, error);
        
        // Update reputation
        await reputationManager.updateReputation(
          userId,
          channel,
          this.getIdentifier(channel, contact),
          'failed'
        );
      }
    }
    
    throw new Error('All channels failed');
  }
  
  private getAvailableChannels(
    contact: Contact,
    preferredChannel: Channel
  ): Channel[] {
    const available: Channel[] = [];
    
    // Start with preferred channel
    if (this.canUseChannel(contact, preferredChannel)) {
      available.push(preferredChannel);
    }
    
    // Add fallback channels
    for (const channel of this.channelPriority) {
      if (channel !== preferredChannel && this.canUseChannel(contact, channel)) {
        available.push(channel);
      }
    }
    
    return available;
  }
  
  private canUseChannel(contact: Contact, channel: Channel): boolean {
    switch (channel) {
      case Channel.WHATSAPP:
      case Channel.SMS:
        return !!contact.phone;
      case Channel.EMAIL:
        return !!contact.email;
      case Channel.TELEGRAM:
        return !!contact.telegramId;
      default:
        return false;
    }
  }
}
```

### 7. Auto-Pause System

#### Campaign Auto-Pause Triggers
```typescript
class CampaignAutoManager {
  async monitorCampaign(campaignId: string): Promise<void> {
    const campaign = await getCampaign(campaignId);
    const stats = await getCampaignStats(campaignId);
    
    // Check block rate
    const blockRate = stats.totalBlocked / stats.totalSent;
    if (blockRate > 0.1) { // 10%
      await this.pauseCampaign(campaign, 'high_block_rate', blockRate);
      return;
    }
    
    // Check spam complaints
    const spamRate = stats.spamComplaints / stats.totalSent;
    if (spamRate > 0.05) { // 5%
      await this.pauseCampaign(campaign, 'spam_complaints', spamRate);
      return;
    }
    
    // Check bounce rate (email)
    if (campaign.channel === Channel.EMAIL) {
      const bounceRate = stats.totalBounced / stats.totalSent;
      if (bounceRate > 0.15) { // 15%
        await this.pauseCampaign(campaign, 'high_bounce_rate', bounceRate);
        return;
      }
    }
    
    // Check reputation score
    const reputation = await getReputation(
      campaign.userId,
      campaign.channel
    );
    
    if (reputation.reputationScore < 60) {
      await this.pauseCampaign(campaign, 'low_reputation', reputation.reputationScore);
      return;
    }
  }
  
  private async pauseCampaign(
    campaign: Campaign,
    reason: string,
    metric: number
  ): Promise<void> {
    campaign.status = CampaignStatus.PAUSED;
    await saveCampaign(campaign);
    
    await sendAlert(campaign.userId, {
      type: 'campaign_auto_paused',
      campaignId: campaign.id,
      reason,
      metric,
      message: `Campaign "${campaign.name}" paused due to ${reason} (${metric.toFixed(2)})`
    });
  }
  
  // Auto-resume next day
  async checkAutoResume(): Promise<void> {
    const pausedCampaigns = await getCampaignsByStatus(CampaignStatus.PAUSED);
    
    for (const campaign of pausedCampaigns) {
      const reputation = await getReputation(campaign.userId, campaign.channel);
      
      // Resume if reputation improved
      if (reputation.reputationScore >= 75) {
        campaign.status = CampaignStatus.RUNNING;
        await saveCampaign(campaign);
        
        await sendAlert(campaign.userId, {
          type: 'campaign_auto_resumed',
          campaignId: campaign.id,
          message: `Campaign "${campaign.name}" automatically resumed (reputation: ${reputation.reputationScore})`
        });
      }
    }
  }
}
```

## Channel-Specific Strategies

### WhatsApp Anti-Ban
1. **Message Templates**: Use approved templates for initial messages
2. **Conversation Windows**: Only send within 24-hour conversation window
3. **Media Variety**: Mix text, images, and documents
4. **Phone Number Rotation**: Use multiple WhatsApp Business numbers
5. **Human Handoff**: Transfer to agent for sensitive conversations

### Email Anti-Spam
1. **SPF/DKIM/DMARC**: Proper email authentication
2. **Unsubscribe Link**: Always include
3. **Content Analysis**: Avoid spam trigger words
4. **List Hygiene**: Remove bounced emails
5. **Engagement Tracking**: Remove non-openers after 90 days

### SMS Anti-Block
1. **Sender ID Rotation**: Use multiple sender IDs
2. **Opt-out Keywords**: Handle STOP, UNSUBSCRIBE
3. **Content Guidelines**: Avoid financial/promotional spam words
4. **Time Restrictions**: No messages 9 PM - 8 AM
5. **Carrier-Specific Rules**: Respect carrier guidelines

## Monitoring & Alerts

### Real-Time Monitoring
```typescript
// Monitor reputation in real-time
setInterval(async () => {
  const users = await getActiveUsers();
  
  for (const user of users) {
    for (const channel of Object.values(Channel)) {
      const reputation = await getReputation(user.id, channel);
      
      if (reputation.reputationScore < 70) {
        await triggerAlert(user.id, {
          type: 'reputation_warning',
          channel,
          score: reputation.reputationScore
        });
      }
    }
  }
}, 300000); // Every 5 minutes
```

### Alert Types
- Low reputation warning (< 70)
- Campaign auto-paused
- Quota exceeded
- High block rate detected
- Spam complaints received

## Performance Metrics

### Target KPIs
- **Reputation Score**: > 80 average
- **Delivery Rate**: > 95%
- **Block Rate**: < 2%
- **Spam Complaint Rate**: < 0.5%
- **Bounce Rate**: < 10% (email)

### Success Criteria
- Zero account bans
- Consistent delivery rates
- No spam folder placement (email)
- Maintained sender reputation

## Testing Strategy

### Simulation Tests
1. High-volume sending simulation
2. Rapid-fire burst detection
3. Duplicate message detection
4. Reputation degradation scenarios
5. Warmup schedule validation

### A/B Testing
- Message variation effectiveness
- Optimal delay ranges
- Warmup schedule optimization
- Fallback channel performance

## Best Practices

1. **Start Slow**: Always use warmup mode for new accounts
2. **Monitor Closely**: Watch reputation scores daily
3. **Vary Messages**: Enable variation for all campaigns
4. **Respect Limits**: Don't exceed recommended quotas
5. **Clean Lists**: Remove inactive contacts regularly
6. **Test First**: Send test messages before campaigns
7. **Authenticate**: Properly configure SPF/DKIM for email
8. **Opt-out Management**: Honor unsubscribe requests immediately
9. **Quality Content**: Avoid spammy language
10. **Engage Early**: Prioritize engaged contacts

## Compliance

### Legal Requirements
- CAN-SPAM Act (USA)
- GDPR (EU)
- TCPA (USA - SMS)
- WhatsApp Business Policy

### Implementation
- Unsubscribe tracking
- Consent management
- Opt-out processing within 24 hours
- Business verification for WhatsApp

## Future Enhancements

1. **ML-Based Prediction**: Predict block likelihood
2. **Adaptive Throttling**: AI-adjusted rate limits
3. **Sentiment Analysis**: Avoid sending to negative sentiment
4. **Engagement Scoring**: Prioritize engaged contacts
5. **Cross-Channel Insights**: Learn from all channels
6. **Automated A/B Testing**: Continuous optimization
