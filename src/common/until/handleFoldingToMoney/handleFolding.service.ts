// src/time/time.service.ts
import { Global, Injectable } from '@nestjs/common';

@Global()
@Injectable()
export class handleFoldingService {
  handleFodingToMoney(money: string | number, foldingCurrent: number): number {
    const foldingOne = (Number(money) * 2.2) / 100;
    switch (foldingCurrent) {
      case 1:
        return foldingOne;
      case 2:
        return foldingOne * 2.5;
      case 3:
        return foldingOne * 5.5;
      case 4:
        return foldingOne * 12;
      case 5:
        return foldingOne * 23.5;
      default:
        return 0;
    }
  }

}
