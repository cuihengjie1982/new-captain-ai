import { createClient, RedisClientType } from 'redis';
import { logger } from '@/utils/logger';

let redisClient: RedisClientType;

export async function connectRedis() {
  try {
    const redisConfig: any = {
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      socket: {
        connectTimeout: 5000,
      },
    };

    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }

    redisClient = createClient(redisConfig);

    redisClient.on('error', (error) => {
      logger.error('Redis连接错误:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis连接成功');
    });

    redisClient.on('ready', () => {
      logger.info('Redis准备就绪');
    });

    redisClient.on('end', () => {
      logger.info('Redis连接已关闭');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Redis连接失败:', error);
    throw error;
  }
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis客户端未初始化');
  }
  return redisClient;
}

export async function disconnectRedis() {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis连接已关闭');
    }
  } catch (error) {
    logger.error('关闭Redis连接失败:', error);
    throw error;
  }
}

// Redis工具函数
export class RedisService {
  private client: RedisClientType;

  constructor() {
    this.client = getRedisClient();
  }

  // 设置键值对
  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    if (expireSeconds) {
      await this.client.setEx(key, expireSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  // 获取值
  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  // 删除键
  async del(key: string): Promise<number> {
    return await this.client.del(key);
  }

  // 检查键是否存在
  async exists(key: string): Promise<number> {
    return await this.client.exists(key);
  }

  // 设置过期时间
  async expire(key: string, seconds: number): Promise<boolean> {
    return await this.client.expire(key, seconds);
  }

  // 获取剩余过期时间
  async ttl(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  // 哈希操作
  async hSet(key: string, field: string, value: string): Promise<number> {
    return await this.client.hSet(key, field, value);
  }

  async hGet(key: string, field: string): Promise<string | undefined> {
    return await this.client.hGet(key, field);
  }

  async hGetAll(key: string): Promise<Record<string, string>> {
    return await this.client.hGetAll(key);
  }

  async hDel(key: string, field: string): Promise<number> {
    return await this.client.hDel(key, field);
  }

  // 列表操作
  async lPush(key: string, ...values: string[]): Promise<number> {
    return await this.client.lPush(key, values);
  }

  async rPop(key: string): Promise<string | null> {
    return await this.client.rPop(key);
  }

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.client.lRange(key, start, stop);
  }

  // 集合操作
  async sAdd(key: string, ...members: string[]): Promise<number> {
    return await this.client.sAdd(key, members);
  }

  async sMembers(key: string): Promise<string[]> {
    return await this.client.sMembers(key);
  }

  async sIsMember(key: string, member: string): Promise<boolean> {
    return await this.client.sIsMember(key, member);
  }

  async sRem(key: string, ...members: string[]): Promise<number> {
    return await this.client.sRem(key, members);
  }

  // 发布订阅
  async publish(channel: string, message: string): Promise<number> {
    return await this.client.publish(channel, message);
  }

  // 缓存管理
  async cacheUserSession(userId: string, sessionData: any, expireHours: number = 24): Promise<void> {
    const key = `session:${userId}`;
    await this.set(key, JSON.stringify(sessionData), expireHours * 3600);
  }

  async getUserSession(userId: string): Promise<any | null> {
    const key = `session:${userId}`;
    const session = await this.get(key);
    return session ? JSON.parse(session) : null;
  }

  async cacheEmailVerification(email: string, code: string, expireMinutes: number = 5): Promise<void> {
    const key = `email_verification:${email}`;
    await this.set(key, code, expireMinutes * 60);
  }

  async getEmailVerification(email: string): Promise<string | null> {
    const key = `email_verification:${email}`;
    return await this.get(key);
  }

  // 速率限制
  async checkRateLimit(identifier: string, limit: number, windowSeconds: number): Promise<boolean> {
    const key = `rate_limit:${identifier}`;
    const current = await this.get(key);

    if (!current) {
      await this.set(key, '1', windowSeconds);
      return true;
    }

    const count = parseInt(current);
    if (count >= limit) {
      return false;
    }

    await this.client.incr(key);
    return true;
  }

  // 健康检查
  async healthCheck(): Promise<{ status: string; timestamp: Date }> {
    try {
      await this.client.ping();
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      throw new Error('Redis健康检查失败');
    }
  }
}

export default redisClient || null;