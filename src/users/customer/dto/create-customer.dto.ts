import {
  IsEmail,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsNotEmpty,
  IsIn,
  IsISO8601,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCustomerDto {
  @IsOptional()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
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
  @IsString()
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
  @IsNotEmpty()
  @IsString()
  productName: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsNumber()
  @Type(() => Number)
  pickupLatitude: number;

  @IsNumber()
  @Type(() => Number)
  pickupLongitude: number;

  @IsNotEmpty()
  @IsString()
  pickupAddress: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  deliveryLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  deliveryLongitude?: number;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsNotEmpty()
  @IsString()
  contactPhone: string;

  @IsNotEmpty()
  @IsIn(['wash', 'dry'])
  @IsString()
  laundryType: 'wash' | 'dry';

  @IsNotEmpty()
  @IsIn(['s', 'm', 'l', '0-4', '6-10', '10-20'])
  @IsString()
  weightCategory: 's' | 'm' | 'l' | '0-4' | '6-10' | '10-20';

  @Min(1)
  @IsNumber()
  @Type(() => Number)
  serviceTimeMinutes: number;

  @IsNotEmpty()
  @IsIn(['now', 'schedule'])
  @IsString()
  pickupType: 'now' | 'schedule';

  @ValidateIf((value: CreateOrderDto) => value.pickupType === 'schedule')
  @IsNotEmpty()
  @IsISO8601()
  pickupAt?: string;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  laundryType?: 'wash' | 'dry';

  @IsOptional()
  @IsString()
  weightCategory?: 's' | 'm' | 'l' | '0-4' | '6-10' | '10-20';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  serviceTimeMinutes?: number;

  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pickupLatitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pickupLongitude?: number;

  @IsOptional()
  @IsString()
  pickupType?: 'now' | 'schedule';

  @IsOptional()
  pickupAt?: string;
}
