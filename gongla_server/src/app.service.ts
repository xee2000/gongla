import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'gongla_server',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
