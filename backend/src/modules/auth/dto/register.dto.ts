import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(3)
    @MaxLength(30)
    @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can contain only letters, numbers and underscore' })
    username: string;

    @IsString()
    @MinLength(8)
    @MaxLength(64)
    password: string;
}