import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { SignInDto, SignUpDto } from './dto/auth.dto';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async sendResetPasswordEmail(email: string, resetUrl: string) {
    const gmailUser =
      this.config.get<string>('GMAIL_USER') ||
      this.config.get<string>('MAIL_USER');
    const gmailPass =
      this.config.get<string>('GMAIL_APP_PASSWORD') ||
      this.config.get<string>('MAIL_PASS');
    const fromEmail = this.config.get<string>('MAIL_FROM') || gmailUser;

    if (!gmailUser || !gmailPass || !fromEmail) {
      throw new BadRequestException(
        'Email service is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD.',
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    try {
      await transporter.sendMail({
        from: fromEmail,
        to: email,
        subject: 'Reset your Laundry Shop password',
        text: `Reset your Laundry Shop password\n\nWe received a request to reset your password.\nUse the link below within 15 minutes:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
        html: `
          <!doctype html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>Reset your Laundry Shop password</title>
            </head>
            <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:24px 12px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
                      <tr>
                        <td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:24px 28px;color:#ffffff;">
                          <div style="font-size:13px;letter-spacing:1.4px;text-transform:uppercase;opacity:0.9;font-weight:700;">Laundry Shop</div>
                          <div style="margin-top:8px;font-size:24px;line-height:1.3;font-weight:800;">Reset your password</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:28px;">
                          <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#334155;">
                            We received a request to reset the password for your Laundry Shop account.
                          </p>
                          <p style="margin:0 0 22px 0;font-size:15px;line-height:1.7;color:#334155;">
                            For your security, this link expires in <strong>15 minutes</strong>.
                          </p>

                          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                            <tr>
                              <td>
                                <a href="${resetUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">
                                  Reset Password
                                </a>
                              </td>
                            </tr>
                          </table>

                          <p style="margin:0 0 8px 0;font-size:13px;line-height:1.7;color:#64748b;">
                            If the button doesn’t work, copy and paste this URL into your browser:
                          </p>
                          <p style="margin:0 0 22px 0;word-break:break-all;font-size:13px;line-height:1.6;color:#2563eb;">
                            <a href="${resetUrl}" style="color:#2563eb;text-decoration:underline;">${resetUrl}</a>
                          </p>

                          <div style="margin-top:4px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                            <p style="margin:0;font-size:12px;line-height:1.7;color:#64748b;">
                              If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
                            </p>
                          </div>
                        </td>
                      </tr>
                    </table>
                    <p style="max-width:620px;margin:14px auto 0 auto;padding:0 8px;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
                      This is an automated message from Laundry Shop. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `,
      });
    } catch {
      throw new BadRequestException(
        'Failed to send reset email. Check Gmail credentials and App Password.',
      );
    }
  }

  private async signTokens(user: { id: string; email: string; role: string }) {
    const accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');

    const accessExp = parseInt(
      this.config.get<string>('JWT_ACCESS_EXPIRATION') ?? '900',
      10,
    );
    const refreshExp = parseInt(
      this.config.get<string>('JWT_REFRESH_EXPIRATION') ?? '604800',
      10,
    );

    const payload = { sub: user.id, email: user.email, role: user.role };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExp,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExp,
      }),
    ]);

    return { access_token, refresh_token };
  }

  private async storeRefreshHash(userId: string, refreshToken: string) {
    const hash = await argon2.hash(refreshToken);
    await this.usersService.setRefreshTokenHash(userId, hash);
  }

  async forgotPassword(rawEmail: string) {
    const email = this.normalizeEmail(rawEmail);
    const user = await this.usersService.findByEmailForReset(email);

    if (!user) {
      return {
        success: true,
        message: 'If this email exists, a reset link has been sent.',
      };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.usersService.setPasswordResetToken(
      String(user._id),
      tokenHash,
      expiresAt,
    );

    const frontendBase =
      this.config.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const resetUrl = `${frontendBase.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

    await this.sendResetPasswordEmail(email, resetUrl);

    return {
      success: true,
      message: 'If this email exists, a reset link has been sent.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token) throw new BadRequestException('Invalid token');
    if (!newPassword || newPassword.trim().length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const tokenHash = this.hashResetToken(token);
    const user =
      await this.usersService.findByResetPasswordTokenHash(tokenHash);

    if (
      !user ||
      !user.resetPasswordExpiresAt ||
      user.resetPasswordExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    const passwordHash = await argon2.hash(newPassword.trim());
    await this.usersService.updatePasswordByUserId(
      String(user._id),
      passwordHash,
    );

    return { success: true, message: 'Password reset successful' };
  }

  async signUp(dto: SignUpDto) {
    const email = this.normalizeEmail(dto.email);
    const userExists = await this.usersService.findByEmail(email);

    if (userExists) throw new BadRequestException('Email นี้ถูกใช้งานแล้ว');
    if (dto.role === 'admin')
      throw new BadRequestException('ไม่สามารถสมัครบัญชีแอดมินผ่านหน้านี้ได้');
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match');
    }

    const passwordHash = await argon2.hash(dto.password);
    const signupRole =
      dto.role === 'rider' || dto.role === 'employee' ? dto.role : 'user';

    const newUser = await this.usersService.create({
      email,
      passwordHash,
      role: signupRole,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phoneNumber: dto.phoneNumber.trim(),
    });

    const tokens = await this.signTokens({
      id: String(newUser._id),
      email: newUser.email,
      role: newUser.role,
    });
    await this.storeRefreshHash(String(newUser._id), tokens.refresh_token);
    return tokens;
  }

  async signIn(dto: SignInDto) {
    const email = this.normalizeEmail(dto.email);

    const user = await this.usersService.findByEmailWithAuthSecrets(email);
    if (!user) throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

    const isCurrentlyBanned = await this.usersService.enforceBanStateForSignIn(
      user as any,
    );
    if (isCurrentlyBanned)
      throw new ForbiddenException('บัญชีนี้ถูกระงับการใช้งาน');

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!passwordMatches)
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');

    // Enforce portal role match: only admins may sign in with any requested role.
    if (dto.role) {
      const normalizeRole = (value?: string | null) =>
        String(value ?? '')
          .trim()
          .toLowerCase();
      const requestedRole = normalizeRole(dto.role);
      const accountRole = normalizeRole((user as any).role);
      const isAdmin = accountRole === 'admin';

      if (!isAdmin && accountRole !== requestedRole) {
        // Dev-friendly diagnostic (won't leak to client response)
        // Useful when Mac/PC are pointing at different backends/DBs.

        console.warn(
          `[auth] role mismatch for ${email}: requested=${requestedRole} account=${accountRole}`,
        );
        throw new ForbiddenException('Role does not match this account');
      }
    }

    const tokens = await this.signTokens({
      id: String(user._id),
      email: user.email,
      role: user.role,
    });
    await this.storeRefreshHash(String(user._id), tokens.refresh_token);
    return tokens;
  }

  async refreshTokens(
    userId: string,
    email: string,
    role: string,
    refreshToken: string,
  ) {
    if (!refreshToken) throw new ForbiddenException('Access denied');

    const user = await this.usersService.findByIdWithRefresh(userId);
    if (!user?.refreshTokenHash) throw new ForbiddenException('Access denied');

    const matches = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!matches) throw new ForbiddenException('Access denied');

    const tokens = await this.signTokens({ id: userId, email, role });
    await this.storeRefreshHash(userId, tokens.refresh_token);

    return tokens;
  }

  async logout(userId: string) {
    await this.usersService.setRefreshTokenHash(userId, null);
    return { success: true };
  }
}
