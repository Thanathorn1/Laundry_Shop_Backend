import { IsEmail, IsString, IsPhoneNumber, IsOptional, IsNumber, Min, Max, IsArray } from 'class-validator';

export class CreateCustomerDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsPhoneNumber('TH') // Thailand phone number
  phoneNumber: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsPhoneNumber('TH')
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  profileImage?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateReviewDto {
  @IsString()
  reviewType: 'merchant' | 'rider';

  @IsOptional()
  @IsString()
  targetId?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  isAnonymous?: boolean;
}

export class CreateOrderDto {
  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsNumber()
  pickupLatitude: number;

  @IsNumber()
  pickupLongitude: number;

  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @IsOptional()
  @IsNumber()
  deliveryLatitude?: number;

  @IsOptional()
  @IsNumber()
  deliveryLongitude?: number;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;
}
