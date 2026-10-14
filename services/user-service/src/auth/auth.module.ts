import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { UsersRepository } from '../users/users.repository';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Module({
  imports: [MailModule],
  controllers: [AuthController],
  providers: [UsersRepository, AuthService, AuthGuard],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
