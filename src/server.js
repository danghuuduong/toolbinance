// /src/server.js
const express = require('express');
const { getBTCPrice } = require('./index'); // Import hàm lấy giá BTC từ backend
const app = express();
const path = require('path');
const port = 3000;

// Cung cấp các file tĩnh từ thư mục public (chỉ HTML, CSS)
app.use(express.static(path.join(__dirname, '../public')));

// API lấy giá BTC
app.get('/get-btc-price', async (req, res) => {
  try {
    const price = await getBTCPrice(); // Gọi hàm từ index.js
    
    res.json(price); // Trả lại giá BTC
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi lấy giá BTC' });
  }
});

// Bắt đầu server
app.listen(port, () => {
  console.log(`Server chạy http://localhost:${port}`);
});
