import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional() @IsString() @MaxLength(150)
  siteName?: string;

  @IsOptional() @IsString() @MaxLength(150)
  metaTitle?: string;

  @IsOptional() @IsString() @MaxLength(300)
  metaDescription?: string;

  @IsOptional() @IsString() @MaxLength(300)
  metaKeywords?: string;
}
