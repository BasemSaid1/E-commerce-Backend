import { IsNotEmpty, IsString } from 'class-validator';

export class LoginGoogleDto {
  @IsString()
  @IsNotEmpty({ message: 'idToken is required' })
  idToken: string;
}
