import { HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class StatusTradingService {


  private isTrading: boolean = false;
  private currentTradeAmount: number = 10; // bắt đầu với $10


  async startTrading() {
    this.isTrading = true;
    await this.placeTrade(this.currentTradeAmount);

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Giao dịch bắt đầu',
      isTrading: this.isTrading,
    };

  }

  async stopTrading() {
    this.isTrading = false;
    return { message: 'Giao dịch đã dừng' };
  }

  async placeTrade(amount: number) {
    console.log(`Đang thực hiện giao dịch với ${amount}$`);

    const stopLoss = 1000;  // giả sử SL là 1000 giá dưới mức giá hiện tại
    const takeProfit = 1000; // giả sử TP là 1000 giá trên mức giá hiện tại

    // Giả sử gọi API của Binance để thực hiện lệnh mua và thiết lập SL, TP
    // Đây chỉ là giả lập, bạn sẽ thay bằng API thực tế của Binance
    console.log(`Thực hiện lệnh mua với ${amount}$, SL: ${stopLoss}, TP: ${takeProfit}`);

    // Sau khi thực hiện lệnh mua, chờ kết quả (thua hoặc thắng)
    // Nếu thua, tăng số tiền giao dịch lên 20$, 40$, ...
    // if (amount < 60) {
    //   this.currentTradeAmount = amount * 2;  // Tăng gấp đôi số tiền cho lần giao dịch tiếp theo
    //   console.log(`Lệnh đã thua, tiếp tục với ${this.currentTradeAmount}$`);
    //   await this.placeTrade(this.currentTradeAmount);
    // } else {
    //   console.log('Kết thúc giao dịch sau khi đạt 60$');
    //   this.isTrading = false;
    // }
  }


  async getStatusTrading() {
    return this.isTrading;
  }

}
