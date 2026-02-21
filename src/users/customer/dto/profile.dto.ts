import {
  IsEmail,
  IsString,
  IsPhoneNumber,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s]*$/, { message: 'First name must not contain special characters' })
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s]*$/, { message: 'Last name must not contain special characters' })
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber('TH')
  phoneNumber?: string;
}

export class ProfileResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  phoneVerified: boolean;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export class ProfileImageResponseDto {
  profileImageUrl: string;
  message: string;
}

export class SavedAddressDto {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export class CreateSavedAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  label: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  address: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class SavedAddressesResponseDto {
  addresses: SavedAddressDto[];
}
