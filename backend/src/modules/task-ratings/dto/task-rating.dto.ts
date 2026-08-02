import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RateTaskDto {
  @IsInt() @Min(1) @Max(5)
  score!: number;

  @IsOptional() @IsString()
  feedback?: string;
}
