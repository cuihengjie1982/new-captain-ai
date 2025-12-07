import jwt from 'jsonwebtoken';
import { JwtPayload } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export class JWTService {
  // 生成访问令牌
  static generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const tokenPayload: JwtPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7天
    };

    return jwt.sign(tokenPayload, JWT_SECRET, {
      algorithm: 'HS256',
    });
  }

  // 生成刷新令牌
  static generateRefreshToken(userId: string): string {
    const payload = {
      userId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30天
    };

    return jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
    });
  }

  // 验证令牌
  static verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('令牌已过期');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('无效的令牌');
      } else {
        throw new Error('令牌验证失败');
      }
    }
  }

  // 解码令牌（不验证）
  static decodeToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  // 检查令牌是否即将过期（1小时内）
  static isTokenExpiringSoon(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    const oneHour = 60 * 60;

    return timeUntilExpiry < oneHour;
  }

  // 从请求头中提取令牌
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  // 生成临时令牌（用于邮箱验证等）
  static generateTemporaryToken(payload: any, expiresInMinutes: number = 15): string {
    return jwt.sign(payload, JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: `${expiresInMinutes}m`,
    });
  }

  // 验证临时令牌
  static verifyTemporaryToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
      });
    } catch (error) {
      throw new Error('临时令牌无效或已过期');
    }
  }
}

export default JWTService;