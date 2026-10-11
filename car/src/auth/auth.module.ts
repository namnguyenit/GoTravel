import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';

@Module({
  providers: [Reflector, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
