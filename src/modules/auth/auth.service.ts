import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity.js';
import { UsersRepository } from '../users/users.repository.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const password = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({ ...dto, password });
    await this.usersRepository.save(user);

    return this.buildTokenPair(user, [], []);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findByEmailWithPassword(
      dto.email,
    );

    const passwordMatches = user
      ? await bcrypt.compare(dto.password, user.password)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { roles, permissions } = this.flattenRolePermissions(user);
    return this.buildTokenPair(user, roles, permissions);
  }

  async refreshToken(token: string) {
    let payload: { sub: string };

    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Refresh token not valid');
    }

    const user = await this.usersRepository.findOneWithRelations(
      payload.sub,
    );

    if (!user) {
      throw new UnauthorizedException('Refresh token not valid');
    }

    const { roles, permissions } = this.flattenRolePermissions(user);
    return this.buildTokenPair(user, roles, permissions);
  }

  private flattenRolePermissions(user: User) {
    const roles = user.roles.map((role) => role.name);
    const permissions = [
      ...new Set(
        user.roles.flatMap((role) => role.permissions.map((p) => p.name)),
      ),
    ];
    return { roles, permissions };
  }

  private async buildTokenPair(
    user: User,
    roles: string[],
    permissions: string[],
  ) {
    const accessPayload = {
      sub: user.id,
      email: user.email,
      roles,
      permissions,
    };
    const refreshPayload = { sub: user.id };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: this.configService.get(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: this.configService.get(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
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
