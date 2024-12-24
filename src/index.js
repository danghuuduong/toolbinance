// /src/index.js
const ccxt = require('ccxt');

// Hàm lấy giá BTC từ sàn Binance
async function getBTCPrice() {
  try {
    const exchange = new ccxt.binance(); // Sử dụng sàn Binance
    const fullValueBtc = await exchange.fetchTicker('BTC/USDT'); // Lấy thông tin ticker BTC/USDT
    
    return fullValueBtc; 
  } catch (error) {
    throw new Error('Lỗi lấy giá BTC: ' + error.message);
  }
}

module.exports = { getBTCPrice }; // Export hàm để sử dụng trong server.js
