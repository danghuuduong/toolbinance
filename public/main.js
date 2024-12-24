import Candle from './components/Candle.js';


// Lấy giá BTC từ API
const getBTCPrice = async () => {
  try {
    const response = await fetch('/get-btc-price');
    
    const data = await response.json();

    const candleData = {
      open: data?.open,//openPrice
      close: data?.close,//closePrice
      high: data?.high,
      low: data?.low
    };
    
    document.getElementById('btc-price').innerText = data ? `${data.last} USDT` : 'Không thể lấy giá';
  } catch (error) {
    document.getElementById('btc-price').innerText = 'Lỗi kết nối';
  }
};
getBTCPrice()

const datas = {
  open: 95872.24,  // Giá mở cửa
  close: 94294.32, // Giá đóng cửa
  high: 96538.92,  // Giá cao nhất trong phiên
  low: 92520       // Giá thấp nhất trong phiên
};


const handleCandle = (candleData) => {
  const container = document.getElementById('candlestick-container');
  container.innerHTML = Candle(candleData);
}

handleCandle(datas)
