import nodemailer from 'nodemailer';
import { logger } from '@/utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // 发送验证码邮件
  async sendVerificationCode(email: string, code: string, type: 'register' | 'login' | 'reset' = 'register'): Promise<void> {
    const subject = this.getEmailSubject(type);
    const html = this.getVerificationEmailTemplate(code, type);

    try {
      await this.transporter.sendMail({
        from: `"Captain AI" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        html,
      });

      logger.info('验证码邮件发送成功', { email, type });
    } catch (error) {
      logger.error('验证码邮件发送失败', { email, type, error });
      throw error;
    }
  }

  // 发送密码重置邮件
  async sendPasswordReset(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3002'}/reset-password?token=${resetToken}`;
    const html = this.getPasswordResetEmailTemplate(resetUrl);

    try {
      await this.transporter.sendMail({
        from: `"Captain AI" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Captain AI - 密码重置',
        html,
      });

      logger.info('密码重置邮件发送成功', { email });
    } catch (error) {
      logger.error('密码重置邮件发送失败', { email, error });
      throw error;
    }
  }

  // 发送欢迎邮件
  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const html = this.getWelcomeEmailTemplate(name);

    try {
      await this.transporter.sendMail({
        from: `"Captain AI" <${process.env.SMTP_USER}>`,
        to: email,
        subject: '欢迎使用 Captain AI',
        html,
      });

      logger.info('欢迎邮件发送成功', { email, name });
    } catch (error) {
      logger.error('欢迎邮件发送失败', { email, name, error });
      throw error;
    }
  }

  // 发送通用邮件
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Captain AI" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });

      logger.info('邮件发送成功', { to, subject });
    } catch (error) {
      logger.error('邮件发送失败', { to, subject, error });
      throw error;
    }
  }

  // 测试邮件配置
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('邮件服务连接测试成功');
      return true;
    } catch (error) {
      logger.error('邮件服务连接测试失败', { error });
      return false;
    }
  }

  // 获取邮件主题
  private getEmailSubject(type: 'register' | 'login' | 'reset'): string {
    switch (type) {
      case 'register':
        return 'Captain AI - 注册验证码';
      case 'login':
        return 'Captain AI - 登录验证码';
      case 'reset':
        return 'Captain AI - 重置密码验证码';
      default:
        return 'Captain AI - 验证码';
    }
  }

  // 获取验证码邮件模板
  private getVerificationEmailTemplate(code: string, type: 'register' | 'login' | 'reset'): string {
    const typeText = {
      register: '注册',
      login: '登录',
      reset: '重置密码',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Captain AI - 验证码</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .code { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Captain AI</h1>
            <p>${typeText[type]}验证码</p>
          </div>
          <div class="content">
            <p>您好！</p>
            <p>您正在进行 Captain AI 的${typeText[type]}操作，您的验证码是：</p>
            <div class="code">${code}</div>
            <p>验证码有效期为 5 分钟，请及时使用。</p>
            <p>如果您没有进行此操作，请忽略此邮件。</p>
          </div>
          <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>&copy; 2024 Captain AI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // 获取密码重置邮件模板
  private getPasswordResetEmailTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Captain AI - 密码重置</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Captain AI</h1>
            <p>密码重置</p>
          </div>
          <div class="content">
            <p>您好！</p>
            <p>我们收到了您的密码重置请求。</p>
            <p>请点击下面的按钮重置您的密码：</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">重置密码</a>
            </div>
            <p>如果您无法点击上面的按钮，请复制以下链接到浏览器地址栏：</p>
            <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 4px;">${resetUrl}</p>
            <p>重置链接有效期为 30 分钟，请及时操作。</p>
            <p>如果您没有请求重置密码，请忽略此邮件。</p>
          </div>
          <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>&copy; 2024 Captain AI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // 获取欢迎邮件模板
  private getWelcomeEmailTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Captain AI - 欢迎加入</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .feature { margin: 20px 0; padding: 15px; background: white; border-radius: 5px; border-left: 4px solid #4F46E5; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 欢迎加入 Captain AI</h1>
            <p>${name}，很高兴认识您！</p>
          </div>
          <div class="content">
            <p>感谢您注册 Captain AI，您现在可以使用我们强大的呼叫中心智能辅助平台了。</p>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3002'}" class="button">立即开始使用</a>
            </div>

            <h3>🚀 主要功能</h3>

            <div class="feature">
              <h4>📚 博客与洞察</h4>
              <p>阅读行业最新文章，获取AI助手的专业解读。</p>
            </div>

            <div class="feature">
              <h4>🧭 诊断罗盘</h4>
              <p>智能诊断呼叫中心问题，提供精准解决方案。</p>
            </div>

            <div class="feature">
              <h4>⚓ 解决方案库</h4>
              <p>丰富的解决方案案例，助您快速解决实际问题。</p>
            </div>

            <div class="feature">
              <h4>🎯 指挥中心</h4>
              <p>数据驱动的管理工具，优化运营效率。</p>
            </div>

            <div class="feature">
              <h4>🤖 AI学习助手</h4>
              <p>24/7在线AI助手，随时为您提供专业支持。</p>
            </div>

            <h3>💡 快速入门</h3>
            <p>1. 完善您的个人资料</p>
            <p>2. 浏览博客文章，开启AI对话</p>
            <p>3. 使用诊断工具解决实际问题</p>
            <p>4. 在指挥中心查看数据分析</p>

            <p>如果您有任何问题，请随时联系我们的客服团队。</p>
          </div>
          <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>&copy; 2024 Captain AI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export default EmailService;