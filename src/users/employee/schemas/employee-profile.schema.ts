import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class EmployeeProfile {
  @Prop({ default: '' })
  firstName!: string;

  @Prop({ default: '' })
  lastName!: string;

  @Prop({ default: '' })
  phoneNumber!: string;

  @Prop({ default: '' })
  profileImage!: string;
}

export const EmployeeProfileSchema = SchemaFactory.createForClass(EmployeeProfile);
