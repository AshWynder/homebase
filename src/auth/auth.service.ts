import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { auth } from './auth';
import { SignUpDto } from './dto/sign-up.dto';
import { Role } from '../../generated/prisma/enums';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getProfile(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }

    return profile;
  }
}
