import { Controller, Get, Headers } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("me")
  async getMe(@Headers('authorization') authHeader?: string) {
    const response = await fetch('http://localhost:8080/api/users/me', {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `Identity service returned status ${response.status}`);
    }

    const userData = await response.json();
    return userData;
  }
}

