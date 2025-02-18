// src/time/time.service.ts
import { Global, Injectable } from '@nestjs/common';

@Global()
@Injectable()
export class TimeService {
  formatTimestampToDatetime(data): string {
    const timeBinance = new Date(data);

    const day = String(timeBinance.getUTCDate()).padStart(2, '0');
    const month = String(timeBinance.getUTCMonth() + 1).padStart(2, '0'); 
    const year = timeBinance.getUTCFullYear();

    const hours = String(timeBinance.getUTCHours()).padStart(2, '0');
    const minutes = String(timeBinance.getUTCMinutes()).padStart(2, '0');
    const seconds = String(timeBinance.getUTCSeconds()).padStart(2, '0');

    const formattedTime = `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;
    return formattedTime;
  }
}
