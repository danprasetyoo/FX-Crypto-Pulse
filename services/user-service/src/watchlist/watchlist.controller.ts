import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { WatchlistItem } from '@fxpulse/shared';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import type { SessionClaims } from '../auth/auth.service';
import { CreateWatchlistItemDto } from './dto';
import { WatchlistService } from './watchlist.service';

@Controller('watchlist')
@UseGuards(AuthGuard)
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  list(@CurrentUser() user: SessionClaims): Promise<{ items: WatchlistItem[] }> {
    return this.watchlist.list(user.sub).then((items) => ({ items }));
  }

  @Post()
  @HttpCode(201)
  add(
    @CurrentUser() user: SessionClaims,
    @Body() dto: CreateWatchlistItemDto,
  ): Promise<WatchlistItem> {
    return this.watchlist.add(user.sub, dto.type, dto.assetCode);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: SessionClaims,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.watchlist.remove(user.sub, id);
  }
}
