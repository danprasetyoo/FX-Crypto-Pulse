import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  @MaxLength(254)
  email: string;

  @IsString()
  @Length(8, 128, { message: 'Password minimal 8 karakter.' })
  password: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  @MaxLength(254)
  email: string;

  @IsString()
  @Length(1, 128)
  password: string;
}

export class ResetRequestDto {
  @IsEmail({}, { message: 'Format email tidak valid.' })
  @MaxLength(254)
  email: string;
}

export class ResetConfirmDto {
  @IsString()
  @Length(64, 64, { message: 'Token tidak valid.' })
  token: string;

  @IsString()
  @Length(8, 128, { message: 'Password minimal 8 karakter.' })
  password: string;
}
