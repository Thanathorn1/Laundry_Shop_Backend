import { IsEmail, IsIn, IsNotEmpty, IsOptional, MinLength } from 'class-validator'; 

 

export class AuthDto { 

    @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' }) 

    email: string; 

 

    @IsNotEmpty() 

    @MinLength(8, { message: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' }) 

    password: string; 

    @IsOptional()
    @IsIn(['user', 'admin', 'rider', 'employee'])
    role?: 'user' | 'admin' | 'rider' | 'employee';

} 

export class ForgotPasswordDto {
    @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
    email: string;
}

export class ResetPasswordDto {
    @IsNotEmpty({ message: 'reset token is required' })
    token: string;

    @IsNotEmpty()
    @MinLength(8, { message: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' })
    newPassword: string;
}