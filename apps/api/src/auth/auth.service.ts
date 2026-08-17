import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { DATABASE, type Database } from '../db/db.module';
import { users } from '../db/schema';
import { eq, or } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import type { AuthTokens, AuthResponse, User } from '@flowbyte/types';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

const ACCESS_TTL = (process.env.JWT_ACCESS_TTL ?? '15m') as JwtSignOptions['expiresIn'];
const REFRESH_TTL = (process.env.JWT_REFRESH_TTL ?? '30d') as JwtSignOptions['expiresIn'];

export function publicUser(row: { id: string; username: string; email: string; createdAt: Date; updatedAt: Date }): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.db
      .select()
      .from(users)
      .where(or(eq(users.email, dto.email), eq(users.username, dto.username)))
      .limit(1);
    if (existing.length > 0) {
      throw new UnauthorizedException('Username or email already taken');
    }
    const hash = await bcrypt.hash(dto.password, 10);
    const [row] = await this.db
      .insert(users)
      .values({ username: dto.username, email: dto.email, passwordHash: hash })
      .returning();
    if (!row) throw new Error('Failed to create user');
    return { user: publicUser(row), tokens: await this.issueTokens(row) };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(or(eq(users.email, dto.usernameOrEmail), eq(users.username, dto.usernameOrEmail)))
      .limit(1);
    if (!row) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, row.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return { user: publicUser(row), tokens: await this.issueTokens(row) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid refresh token');
    const [row] = await this.db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!row) throw new UnauthorizedException('User no longer exists');
    return this.issueTokens(row);
  }

  async me(userId: string): Promise<User> {
    const [row] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!row) throw new UnauthorizedException('User not found');
    return publicUser(row);
  }

  private async issueTokens(user: {
    id: string;
    username: string;
    email: string;
  }): Promise<AuthTokens> {
    const base = { sub: user.id, username: user.username, email: user.email };
    const accessToken = await this.jwtService.signAsync(
      { ...base, type: 'access' },
      { secret: process.env.JWT_SECRET, expiresIn: ACCESS_TTL },
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'refresh' },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: REFRESH_TTL },
    );
    return { accessToken, refreshToken };
  }
}