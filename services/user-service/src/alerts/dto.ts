import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import type { AlertCondition, AssetType } from '@fxpulse/shared';

export class CreateAlertDto {
  @IsIn(['fx', 'crypto'], { message: 'type harus fx atau crypto.' })
  type: AssetType;

  @IsString()
  @MaxLength(64)
  @Matches(/^([A-Za-z]{3}|[a-z0-9]+(-[a-z0-9]+)*)$/, { message: 'assetCode tidak valid.' })
  assetCode: string;

  @IsIn(['above', 'below'], { message: 'condition harus above atau below.' })
  condition: AlertCondition;

  @IsNumber({}, { message: 'target harus angka.' })
  @IsPositive({ message: 'target harus lebih dari 0.' })
  target: number;

  @IsIn(['IDR', 'USD'], { message: 'currency harus IDR atau USD.' })
  currency: string;
}

export class UpdateAlertDto {
  @IsOptional()
  @IsNumber({}, { message: 'target harus angka.' })
  @IsPositive({ message: 'target harus lebih dari 0.' })
  target?: number;

  @IsOptional()
  @IsIn(['above', 'below'], { message: 'condition harus above atau below.' })
  condition?: AlertCondition;

  @IsOptional()
  @IsIn(['active', 'inactive'], { message: 'status hanya bisa diubah ke active atau inactive.' })
  status?: 'active' | 'inactive';
}
