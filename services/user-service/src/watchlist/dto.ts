import { IsIn, IsString, Matches, MaxLength } from 'class-validator';
import type { AssetType } from '@fxpulse/shared';

export class CreateWatchlistItemDto {
  @IsIn(['fx', 'crypto'], { message: 'type harus fx atau crypto.' })
  type: AssetType;

  @IsString()
  @MaxLength(64)
  @Matches(/^([A-Za-z]{3}|[a-z0-9]+(-[a-z0-9]+)*)$/, {
    message: 'assetCode harus kode mata uang 3 huruf atau id aset kripto.',
  })
  assetCode: string;
}

/** Kode FX disimpan huruf besar, id kripto huruf kecil. */
export function normalizeAssetCode(type: AssetType, code: string): string {
  return type === 'fx' ? code.trim().toUpperCase() : code.trim().toLowerCase();
}
