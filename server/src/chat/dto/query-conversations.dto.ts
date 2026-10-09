import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * GET /conversations — the caller's inbox.
 *
 * Search matches the thread label: a group by property name, a direct thread by
 * the other person's name or email. It is a single prefix/substring match rather
 * than Postgres full-text search, which is proportionate to a chat list that
 * holds tens of threads, not tens of thousands.
 */
export class QueryConversationsDto {
  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'search must be 80 characters or fewer' })
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number;
}

/**
 * GET /conversations/:id/messages — one page of history, oldest-first.
 *
 * Paginates with an opaque cursor rather than page/limit because the messages in
 * a thread only ever grow, so a page/limit cursor silently skips or repeats rows
 * when someone sends a message while you are reading page 2. `before` is a
 * message id: return the page that ends just before it.
 *
 * The ids are `uuid(7)`, which sorts chronologically, so this is a plain indexed
 * range scan with no `created_at` tiebreaker to get wrong.
 */
export class QueryMessagesDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'before must be a valid message id' })
  before?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number;
}

/** POST /conversations/direct — open a thread with someone. */
export class CreateDirectConversationDto {
  /**
   * The other person's profile id.
   *
   * Any profile id is accepted here and then filtered by the authorization rules:
   * the client is handed ids from listings it already fetched, so re-validating
   * the pairing server-side is enough, and a request for a pair that is not
   * allowed gets the same 403 whether the id was made up or merely disallowed.
   */
  @IsUUID(undefined, { message: 'profileId must be a valid UUID' })
  profileId: string;
}