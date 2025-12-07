import knex from 'knex';
import { logger } from '@/utils/logger';

const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'captain_ai',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },
  migrations: {
    directory: './src/database/migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './src/database/seeds'
  }
};

export const db = knex(dbConfig);

export async function connectDatabase() {
  try {
    await db.raw('SELECT 1');
    logger.info('数据库连接成功');
  } catch (error) {
    logger.error('数据库连接失败:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await db.destroy();
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接失败:', error);
    throw error;
  }
}

// 数据库健康检查
export async function checkDatabaseHealth() {
  try {
    await db.raw('SELECT 1');
    return { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    return { status: 'unhealthy', error, timestamp: new Date() };
  }
}

export default db;