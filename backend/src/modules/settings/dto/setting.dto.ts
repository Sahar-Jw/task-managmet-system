import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { SettingType } from '../../../shared/enums/setting-type.enum';
import { SettingValueType } from '../../../shared/enums/setting-value-type.enum';

export class CreateSettingDto {
  @IsEnum(SettingType)
  type!: SettingType;

  /*
   * A setting may now contain Arabic only, English only,
   * or both.
   *
   * The SettingsService validates that at least one
   * language has actually been supplied.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  codeAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  codeEn?: string;

  @IsOptional()
  @IsEnum(SettingValueType)
  valueType?: SettingValueType;

  /*
   * These must be optional at DTO-validation level because
   * the active UI language only sends one of them.
   *
   * The service performs the language-aware validation.
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  valueAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  valueEn?: string;

  @IsOptional()
  @IsNumber()
  valueNumber?: number;

  /*
   * Branch-only.
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  /*
   * Department-only.
   */
  @IsOptional()
  @IsBoolean()
  isAdminDepartment?: boolean;
}

export class UpdateSettingDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  codeAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  codeEn?: string;

  @IsOptional()
  @IsEnum(SettingValueType)
  valueType?: SettingValueType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  valueAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  valueEn?: string;

  @IsOptional()
  @IsNumber()
  valueNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsBoolean()
  isAdminDepartment?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QuerySettingsDto {
  @IsOptional()
  @IsEnum(SettingType)
  type?: SettingType;

  @IsOptional()
  @IsString()
  isActive?: string;
}