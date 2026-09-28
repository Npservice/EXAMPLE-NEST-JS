import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

type ExpiresIn = `${number}${'s' | 'm' | 'h' | 'd'}`;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    return this.buildTokenPair(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    const passwordMatches = user
      ? await bcrypt.compare(dto.password, user.password)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Email atau password salah');
    }

    return this.buildTokenPair(user);
  }

  async refreshToken(token: string) {
    const payload = await this.jwtService
      .verifyAsync<{ sub: string; type: string }>(token)
      .catch(() => null);

    // Access token tidak boleh dipakai untuk refresh.
    if (payload?.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    const user = await this.usersService.findOne(payload.sub).catch(() => null);

    if (!user) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    return this.buildTokenPair(user);
  }

  private async buildTokenPair(user: User) {
    const roles = user.roles.map((role) => role.name);
    const permissions = [
      ...new Set(
        user.roles.flatMap((role) => role.permissions.map((p) => p.name)),
      ),
    ];

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: user.id, email: user.email, roles, permissions, type: 'access' },
        {
          expiresIn: this.configService.get<ExpiresIn>(
            'JWT_ACCESS_EXPIRES_IN',
            '15m',
          ),
        },
      ),
      this.jwtService.signAsync(
        { sub: user.id, type: 'refresh' },
        {
          expiresIn: this.configService.get<ExpiresIn>(
            'JWT_REFRESH_EXPIRES_IN',
            '7d',
          ),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        permissions,
      },
    };
  }
}
