import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Alert } from '@fxpulse/shared';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import type { SessionClaims } from '../auth/auth.service';
import { AlertsService } from './alerts.service';
import { CreateAlertDto, UpdateAlertDto } from './dto';

@Controller('alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@CurrentUser() user: SessionClaims): Promise<{ items: Alert[] }> {
    return this.alerts.list(user.sub).then((items) => ({ items }));
  }

  @Post()
  @HttpCode(201)
  create(@CurrentUser() user: SessionClaims, @Body() dto: CreateAlertDto): Promise<Alert> {
    return this.alerts.create(user.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: SessionClaims,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAlertDto,
  ): Promise<Alert> {
    return this.alerts.update(user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: SessionClaims,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.alerts.remove(user.sub, id);
  }
}
