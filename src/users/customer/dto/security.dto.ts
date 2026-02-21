import { IsString, IsNumber, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(50)
  newPassword: string;
}

export class ChangePasswordResponseDto {
  success: boolean;
  message: string;
}

export class DeviceDto {
  id: string;
  deviceName: string;
  lastAccessedAt: string;
  ipAddress: string;
  isCurrent: boolean;
}

export class DevicesResponseDto {
  devices: DeviceDto[];
}

export class LogoutDeviceResponseDto {
  success: boolean;
  message: string;
}

export class CreateRatingDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  merchantRating: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  riderRating: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  merchantComment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  riderComment?: string;
}

export class RatingResponseDto {
  orderId: string;
  merchantRating: number;
  riderRating: number;
  merchantComment?: string;
  riderComment?: string;
  createdAt: string;
  updatedAt: string;
}

export class CreateRatingResponseDto {
  success: boolean;
  rating: RatingResponseDto;
}
