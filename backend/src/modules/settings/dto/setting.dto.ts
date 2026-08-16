import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { SettingType } from '../../../shared/enums/setting-type.enum';
import { SettingValueType } from '../../../shared/enums/setting-value-type.enum';

export class CreateSettingDto {
  @IsEnum(SettingType)
  type!: SettingType;

  // Required together for department/branch/project_setting (both
  // languages). For the four LIST_SETTING_TYPES categories, only ONE is
  // required — an entry added while the UI is in Arabic only gets codeAr,
  // and stays invisible in English (and vice versa) until someone edits
  // it from the other language later. The service enforces "at least one"
  // for list types and "both required" for the others.
  @IsOptional() @IsString() @MaxLength(100)
  codeAr?: string;

  @IsOptional() @IsString() @MaxLength(100)
  codeEn?: string;

  // Optional/ignored for the four LIST_SETTING_TYPES categories (Task
  // Status/Type/Priority, Project Status) — the service always treats
  // those as bilingual-text rows and derives value fields from
  // codeAr/codeEn automatically. Required for department/branch/
  // project_setting, same as before.
  @IsOptional() @IsEnum(SettingValueType)
  valueType?: SettingValueType;

  // Required when valueType = STRING, ignored (should be omitted) when NUMBER.
  @ValidateIf((o) => o.valueType === SettingValueType.STRING)
  @IsString() @IsNotEmpty() @MaxLength(255)
  valueAr?: string;

  @ValidateIf((o) => o.valueType === SettingValueType.STRING)
  @IsString() @IsNotEmpty() @MaxLength(255)
  valueEn?: string;

  // Required when valueType = NUMBER, ignored (should be omitted) when STRING.
  @ValidateIf((o) => o.valueType === SettingValueType.NUMBER)
  @IsNumber()
  valueNumber?: number;

  // Branch-only; ignored for other types.
  @IsOptional() @IsString() @MaxLength(255)
  address?: string;

  // Department-only; ignored for other types.
  @IsOptional() @IsBoolean()
  isAdminDepartment?: boolean;
}

export class UpdateSettingDto {
  @IsOptional() @IsString() @MaxLength(100)
  codeAr?: string;

  @IsOptional() @IsString() @MaxLength(100)
  codeEn?: string;

  @IsOptional() @IsEnum(SettingValueType)
  valueType?: SettingValueType;

  @ValidateIf((o) => o.valueType === SettingValueType.STRING)
  @IsString() @IsNotEmpty() @MaxLength(255)
  valueAr?: string;

  @ValidateIf((o) => o.valueType === SettingValueType.STRING)
  @IsString() @IsNotEmpty() @MaxLength(255)
  valueEn?: string;

  @ValidateIf((o) => o.valueType === SettingValueType.NUMBER)
  @IsNumber()
  valueNumber?: number;

  @IsOptional() @IsString() @MaxLength(255)
  address?: string;

  @IsOptional() @IsBoolean()
  isAdminDepartment?: boolean;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class QuerySettingsDto {
  @IsOptional() @IsEnum(SettingType)
  type?: SettingType;

  // 'true' -> only active rows (used by dropdowns populating from the
  // Statuses & Types lists). Omitted -> everything, as before.
  @IsOptional() @IsString()
  isActive?: string;
}
