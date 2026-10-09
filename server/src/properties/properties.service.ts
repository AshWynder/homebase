import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { ChatMembershipService } from '../chat/chat-membership.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { AssignCaretakerDto } from './dto/assign-caretaker.dto';
import { Property } from '../../generated/prisma/client';
import { Role } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { managesProperty, managedPropertyWhere } from '../common/property-scope';

/**
 * `name` lives on the related User, so a caretaker shown on a card or in the
 * "assign someone you already added" list is unreadable from the profile row
 * alone. Every property read that feeds the UI goes through this include.
 */
const CARETAKER_WITH_USER = {
  include: { user: { select: { id: true, name: true, email: true } } },
} as const;

/** Owner-only mutation scope: the ids needed to decide 403 vs 404. */
type OwnerGuardTarget = {
  ownerId: string;
  caretakerId: string | null;
};

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly chatMembership: ChatMembershipService,
  ) {}

  async create(dto: CreatePropertyDto, ownerId?: string): Promise<Property> {
    // Prefer the authenticated profile; fall back to the payload for
    // caretaker/admin flows. Never trust a client-sent ownerId blindly.
    const resolvedOwnerId = ownerId ?? dto.ownerId;
    if (!resolvedOwnerId) {
      throw new BadRequestException('ownerId is required');
    }

    if (dto.caretakerId) {
      await this.ensureIsCaretakerProfile(dto.caretakerId);
    }

    return this.prisma.property.create({
      data: {
        name: dto.name,
        address: dto.address,
        owner: { connect: { id: resolvedOwnerId } },
        caretaker: dto.caretakerId
          ? { connect: { id: dto.caretakerId } }
          : undefined,
      },
      include: { caretaker: CARETAKER_WITH_USER },
    });
  }

  async findAll(
    page?: number,
    limit?: number,
    auth?: AuthenticatedUser,
  ): Promise<Property[]> {
    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && page > 0 && take ? (page - 1) * take : undefined;

    return this.prisma.property.findMany({
      // Owners see their own properties; caretakers see their assigned ones.
      where: auth ? managedPropertyWhere(auth) : undefined,
      skip,
      take,
      include: {
        owner: true,
        caretaker: CARETAKER_WITH_USER,
      },
    });
  }

  async findOne(id: string, auth?: AuthenticatedUser): Promise<Property> {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        owner: true,
        caretaker: CARETAKER_WITH_USER,
      },
    });

    if (
      !property ||
      (auth && !managesProperty(auth, property))
    ) {
      // A property outside a caretaker's assignment is reported as missing
      // rather than forbidden, so the id cannot be probed for existence.
      throw new NotFoundException(`Property with id "${id}" not found`);
    }

    return property;
  }

  async update(
    id: string,
    dto: UpdatePropertyDto,
    auth: AuthenticatedUser,
  ): Promise<Property> {
    const property = await this.loadForOwnerAction(id, auth);

    if (dto.caretakerId) {
      await this.ensureIsCaretakerProfile(dto.caretakerId);
    }

    return this.prisma.property.update({
      where: { id: property.id },
      data: {
        name: dto.name,
        address: dto.address,
        owner: dto.ownerId ? { connect: { id: dto.ownerId } } : undefined,
        caretaker: dto.caretakerId
          ? { connect: { id: dto.caretakerId } }
          : dto.caretakerId === null
            ? { disconnect: true }
            : undefined,
      },
      include: { caretaker: CARETAKER_WITH_USER },
    });
  }

  async remove(id: string, auth: AuthenticatedUser): Promise<Property> {
    const property = await this.loadForOwnerAction(id, auth);
    return this.prisma.property.delete({ where: { id: property.id } });
  }

  /**
   * Creates (or attaches) a caretaker and seats them on the property in one
   * request.
   *
   * The single endpoint matters: the client-side alternative — register, then
   * PATCH the caretakerId — leaves an orphaned login behind if the second call
   * fails, and the PATCH path has no idea whether the profile it is handed is
   * actually a caretaker.
   *
   * Group-thread seating: only reconciled when the property's group row already
   * exists. `ensureGroupConversation` reconciles in both directions, so a
   * *replacement* caretaker arriving evicts the previous one in the same pass;
   * a property with no group yet is left alone because thread creation is
   * deliberately lazy (first open seats whoever belongs then).
   */
  async assignCaretaker(
    id: string,
    dto: AssignCaretakerDto,
    auth: AuthenticatedUser,
  ): Promise<Property> {
    const property = await this.loadForOwnerAction(id, auth);

    let caretakerId: string;
    if (dto.mode === 'create') {
      if (!dto.name || !dto.email || !dto.phone || !dto.password) {
        throw new BadRequestException(
          'name, email, phone and password are required to create a caretaker',
        );
      }

      // Reuses the register flow: better-auth signup (duplicate email fails
      // here), phone uniqueness check, profile row with role CARETAKER. The
      // returned session token is discarded — the owner stays signed in.
      const result = await this.authService.register({
        name: dto.name.trim(),
        email: dto.email.trim(),
        phone: dto.phone.trim(),
        password: dto.password,
        role: Role.CARETAKER,
      });
      caretakerId = result.profile.id;
    } else {
      if (!dto.profileId) {
        throw new BadRequestException('profileId is required');
      }

      const profile = await this.prisma.userProfile.findUnique({
        where: { id: dto.profileId },
        select: { id: true, role: true },
      });
      if (!profile) {
        throw new NotFoundException('Caretaker not found');
      }
      if (profile.role !== Role.CARETAKER) {
        throw new BadRequestException('That profile is not a caretaker');
      }
      caretakerId = profile.id;
    }

    const updated = await this.prisma.property.update({
      where: { id: property.id },
      data: { caretakerId },
      include: { caretaker: CARETAKER_WITH_USER },
    });

    const group = await this.prisma.conversation.findUnique({
      where: { propertyId: property.id },
      select: { id: true },
    });
    if (group) {
      await this.chatMembership.ensureGroupConversation(property.id);
    }

    return updated;
  }

  /**
   * Detaches the caretaker and evicts them from the property's group thread —
   * the same lifecycle a terminated tenancy gets. Direct threads with the owner
   * or tenants survive: those are conversations between two specific people,
   * not a view of the property.
   */
  async removeCaretaker(
    id: string,
    auth: AuthenticatedUser,
  ): Promise<Property> {
    const property = await this.loadForOwnerAction(id, auth);
    if (!property.caretakerId) {
      throw new BadRequestException('This property has no caretaker');
    }

    const updated = await this.prisma.property.update({
      where: { id: property.id },
      data: { caretakerId: null },
      include: { caretaker: CARETAKER_WITH_USER },
    });

    await this.chatMembership.removeFromPropertyGroup(
      property.caretakerId,
      property.id,
    );

    return updated;
  }

  /**
   * Owner-only gate for mutations.
   *
   * The caretaker of *this* property is a known, non-probing caller who is
   * simply not allowed to manage it — 403. Anyone else gets 404, matching the
   * read path, so property ids cannot be confirmed from outside an owner's
   * portfolio.
   */
  private async loadForOwnerAction(
    id: string,
    auth: AuthenticatedUser,
  ): Promise<{ id: string; ownerId: string; caretakerId: string | null }> {
    const property = await this.prisma.property.findUnique({
      where: { id },
      select: { id: true, ownerId: true, caretakerId: true },
    });
    if (!property) {
      throw new NotFoundException(`Property with id "${id}" not found`);
    }

    if (property.ownerId !== auth.profile.id) {
      if (property.caretakerId === auth.profile.id) {
        throw new ForbiddenException(
          'Only the property owner can manage this property',
        );
      }
      throw new NotFoundException(`Property with id "${id}" not found`);
    }

    return property;
  }

  /**
   * Connecting an arbitrary profile as a caretaker would let a tenant (or
   * another owner) be handed staff powers through a stray id, so every connect
   * path checks the role first.
   */
  private async ensureIsCaretakerProfile(profileId: string): Promise<void> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id: profileId },
      select: { role: true },
    });
    if (!profile) {
      throw new NotFoundException('Caretaker not found');
    }
    if (profile.role !== Role.CARETAKER) {
      throw new BadRequestException('That profile is not a caretaker');
    }
  }
}
