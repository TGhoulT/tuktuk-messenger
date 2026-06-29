import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateFavoriteTrackDto {
    @IsString()
    trackName: string;

    @IsOptional()
    @IsString()
    artistName?: string;
}

export class ReorderFavoriteTracksDto {
    @IsString({ each: true })
    trackIds: string[];   // массив id треков в новом порядке
}