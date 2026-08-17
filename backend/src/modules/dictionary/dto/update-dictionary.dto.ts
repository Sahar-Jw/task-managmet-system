import {
  ArrayMaxSize,
  IsArray,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DictionaryItemDto {
  @IsString()
  @MaxLength(255)
  @Matches(/^[A-Za-z0-9_.-]+$/)
  key!: string;

  @IsString()
  @MaxLength(10000)
  textEn!: string;

  @IsString()
  @MaxLength(10000)
  textAr!: string;
}

export class UpdateDictionaryDto {
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => DictionaryItemDto)
  entries!: DictionaryItemDto[];
}
