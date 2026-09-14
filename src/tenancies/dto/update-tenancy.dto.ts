import { PartialType } from '@nestjs/mapped-types';
import { CreateTenancyDto } from './create-tenancy.dto';

export class UpdateTenancyDto extends PartialType(CreateTenancyDto) {}
