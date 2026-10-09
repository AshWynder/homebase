import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { PrismaService } from '../../prisma/prisma.service';
import { R2Service } from '../common/storage/r2.service';
import { auth } from './auth';
import { SignUpDto } from './dto/sign-up.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role } from '../../generated/prisma/enums';
import { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

/** Ceiling on a single page of the user directory. */
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

export interface UploadedAvatar {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  async register(dto: SignUpDto) {
    // 1. Check if phone or nationalId already exists
    const existingProfile = await this.prisma.userProfile.findFirst({
      where: {
        OR: [
          { phone: dto.phone },
          ...(dto.nationalId ? [{ nationalId: dto.nationalId }] : []),
        ],
      },
    });

    if (existingProfile) {
      if (existingProfile.phone === dto.phone) {
        throw new ConflictException(
          `User with phone number ${dto.phone} already exists`,
        );
      }
      if (dto.nationalId && existingProfile.nationalId === dto.nationalId) {
        throw new ConflictException(
          `User with national ID ${dto.nationalId} already exists`,
        );
      }
    }

    // 2. Register user via Better Auth
    let signUpResult: any;
    try {
      signUpResult = await auth.api.signUpEmail({
        body: {
          email: dto.email,
          password: dto.password,
          name: dto.name,
        },
      });
    } catch (error: any) {
      throw new BadRequestException(
        error?.body?.message || error?.message || 'Failed to sign up user',
      );
    }

    if (!signUpResult?.user?.id) {
      throw new InternalServerErrorException('Failed to create user account');
    }

    // 3. Create linked UserProfile
    const profile = await this.prisma.userProfile.create({
      data: {
        userId: signUpResult.user.id,
        phone: dto.phone,
        role: dto.role ?? Role.TENANT,
        nationalId: dto.nationalId ?? null,
      },
    });

    return {
      user: signUpResult.user,
      token: signUpResult.token,
      profile,
    };
  }

  async updateProfile(dto: UpdateProfileDto, caller: AuthenticatedUser) {
    const userId = caller.user.id;
    const profileId = caller.profile.id;

    if (dto.phone && dto.phone !== caller.profile.phone) {
      const existing = await this.prisma.userProfile.findFirst({
        where: { phone: dto.phone, id: { not: profileId } },
      });
      if (existing) {
        throw new ConflictException(`Phone number ${dto.phone} is already in use`);
      }
    }

    if (dto.email && dto.email !== caller.user.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email, id: { not: userId } },
      });
      if (existing) {
        throw new ConflictException(`Email ${dto.email} is already in use`);
      }
    }

    const [updatedUser, updatedProfile] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.email ? { email: dto.email.trim() } : {}),
          ...(dto.image !== undefined ? { image: dto.image } : {}),
        },
      }),
      this.prisma.userProfile.update({
        where: { id: profileId },
        data: {
          ...(dto.phone ? { phone: dto.phone.trim() } : {}),
          ...(dto.nationalId !== undefined ? { nationalId: dto.nationalId?.trim() || null } : {}),
        },
      }),
    ]);

    return {
      user: { ...updatedUser, image: updatedUser.image ?? null },
      profile: updatedProfile,
    };
  }

  async uploadAvatar(file: UploadedAvatar, caller: AuthenticatedUser) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No image file provided');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Uploaded file must be an image');
    }

    let imageUrl: string;

    if (this.r2.isConfigured) {
      const key = this.r2.buildKey(`avatars/${caller.user.id}`, file.originalname || 'avatar.jpg');
      const uploaded = await this.r2.upload(key, file.buffer, file.mimetype);
      imageUrl = uploaded.url;
    } else {
      // Fallback base64 data URI if storage service is not configured
      imageUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: caller.user.id },
      data: { image: imageUrl },
    });

    const profile = await this.prisma.userProfile.findUnique({
      where: { id: caller.profile.id },
    });

    return {
      user: { ...updatedUser, image: updatedUser.image ?? null },
      profile: profile!,
    };
  }

  async changePassword(dto: ChangePasswordDto, caller: AuthenticatedUser, rawHeaders: any) {
    try {
      await auth.api.changePassword({
        body: {
          currentPassword: dto.currentPassword,
          newPassword: dto.newPassword,
          revokeOtherSessions: false,
        },
        headers: fromNodeHeaders(rawHeaders),
      });
      return { success: true, message: 'Password updated successfully' };
    } catch (error: any) {
      throw new BadRequestException(
        error?.body?.message || error?.message || 'Failed to update password',
      );
    }
  }

  /**
   * Phone variants for a free-text search term.
   */
  private phoneSearchFilters(term: string): Prisma.UserProfileWhereInput[] {
    const digits = term.replace(/\D/g, '');
    if (!digits) return [];

    const filters: Prisma.UserProfileWhereInput[] = [
      { phone: { contains: digits, mode: 'insensitive' } },
    ];

    if (digits.startsWith('0') && digits.length === 10) {
      filters.push({ phone: { contains: `+254${digits.slice(1)}` } });
    }
    if (digits.startsWith('254') && digits.length === 12) {
      filters.push({ phone: { contains: `0${digits.slice(3)}` } });
    }
    if (digits.length >= 9) {
      filters.push({ phone: { endsWith: digits.slice(-9) } });
    }

    return filters;
  }

  async findUsers(query: QueryUsersDto, caller: AuthenticatedUser) {
    if (caller.profile.role === Role.TENANT) {
      throw new ForbiddenException(
        'You are not allowed to browse the user directory',
      );
    }

    const role = query.role ?? Role.TENANT;
    const search = query.search?.trim();

    const take = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = ((query.page ?? 1) - 1) * take;

    const or: Prisma.UserProfileWhereInput[] | undefined = search
      ? [
          { user: { is: { name: { contains: search, mode: 'insensitive' } } } },
          { user: { is: { email: { contains: search, mode: 'insensitive' } } } },
          { nationalId: { contains: search, mode: 'insensitive' } },
          ...this.phoneSearchFilters(search),
        ]
      : undefined;

    const where: Prisma.UserProfileWhereInput = {
      role,
      ...(role === Role.TENANT
        ? { tenancies: { none: { isActive: true } } }
        : {}),
      ...(or ? { OR: or } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.userProfile.findMany({
        where,
        skip,
        take,
        orderBy: { user: { name: 'asc' } },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.userProfile.count({ where }),
    ]);

    return { items, total, page: query.page ?? 1, limit: take };
  }
}
