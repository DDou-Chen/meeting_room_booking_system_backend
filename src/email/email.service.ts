import { Injectable } from '@nestjs/common';
import { Transporter, createTransport } from 'nodemailer';

const adminEmail = '913321406@qq.com'; // 发邮件的邮箱地址
const pass = 'nzdyfpcnpunsbdhh'; // 邮箱授权码

@Injectable()
export class EmailService {
  private transport: Transporter;

  constructor() {
    this.transport = createTransport({
      host: 'smtp.qq.com',
      port: 587,
      secure: false,
      auth: {
        user: adminEmail,
        pass: pass,
      },
    });
  }

  async sendMail({ to, subject, html }) {
    await this.transport.sendMail({
      from: { name: '会议室预定系统', address: adminEmail },
      to,
      subject,
      html,
    });
  }
}
