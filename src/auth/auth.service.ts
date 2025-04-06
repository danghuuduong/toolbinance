
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { comparePasswordHelper } from 'src/helper/until';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) { }

  async signIn(
    email: string,
    pass: string,
  ): Promise<{ access_token: string }> {
    console.log('email', email);
    console.log('pass', pass);
    
    const user = await this.usersService.findOneEmail(email);
    console.log('user', user);
   
    const isValidPassword = await comparePasswordHelper(pass, user?.password)
    if (!isValidPassword || !user?._id) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng');
    }
    const payload = { sub: user._id, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
