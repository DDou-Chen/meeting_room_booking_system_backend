import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transporter, createTransport } from 'nodemailer';

@Injectable()
export class EmailService {
  private transport: Transporter;

  constructor(private configService: ConfigService) {
    const getEnvBuKey = (key: string) => this.configService.get(key);

    this.transport = createTransport({
      host: getEnvBuKey('nodemailer_host'),
      port: getEnvBuKey('nodemailer_port'),
      secure: false,
      auth: {
        user: getEnvBuKey('nodemailer_auth_user'),
        pass: getEnvBuKey('nodemailer_auth_pass'),
      },
    });
  }

  async sendMail({ to, subject, html }) {
    await this.transport.sendMail({
      from: {
        name: '会议室预定系统',
        address: this.configService.get('nodemailer_auth_user'),
      },
      to,
      subject,
      html,
    });
  }
}
