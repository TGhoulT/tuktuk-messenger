import { IsOptional, IsInt, Min, Max, IsObject } from 'class-validator';

export class UpdateSettingsDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(365)
    sessionLifetimeDays?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(24)
    autoDeleteMonths?: number;

    @IsOptional()
    @IsObject()
    privacy?: object;

    @IsOptional()
    @IsObject()
    interface?: object;
}