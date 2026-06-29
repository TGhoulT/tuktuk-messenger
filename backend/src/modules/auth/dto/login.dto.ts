import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class LoginDto {
    @IsString()
    emailOrUsername: string;

    @IsString()
    password: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(365)
    sessionLifetimeDays?: number;
}