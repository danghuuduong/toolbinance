const Candle = ({ open, close, high, low }) => {
  // Tính toán chiều cao và vị trí của thân nến và râu nến
  const wickHighHeight = ((high - open) / (high - low)) * 100;
  const wickLowHeight = ((close - low) / (high - low)) * 100;
  const bodyHeight = (Math.abs(open - close) / (high - low)) * 100;
  const bodyTop = (Math.min(open, close) / (high - low)) * 100;
  console.log("🚀 ~ Candle ~ bodyTop:", bodyTop);
  const isUp = close > open; // Kiểm tra xem nến tăng hay giảm

  console.log(
    "open, close, high, low",
    wickHighHeight,
    wickLowHeight,
    bodyHeight,
    bodyTop,
    isUp
  );
  console.log("Math.abs(open - close)", Math.abs(open - close));
  console.log("(high - low) * 100", high - low);
  console.log("bodyHeight", bodyHeight);

  //   return `
  //   <div class="candlestick">
  //     <div class="wick-high" style="height: ${wickHighHeight}%; top: ${isUp ? 0 : bodyTop + bodyHeight}%;"></div>

  //     <div class="body" style="height: ${bodyHeight}%; top: ${bodyTop}%; background-color: ${isUp ? 'green' : 'red'};"></div>

  //     <div class="wick-low" style="height: ${wickLowHeight}%; top: ${isUp ? 100 - wickLowHeight : bodyTop + bodyHeight}%;"></div>
  //   </div>
  // `;

  return `
<div class="candlestick">
  <div class="body" style="height:${bodyHeight}px; top: ${bodyTop}px; background-color: ${
    isUp ? "green" : "red"
  };"></div>
</div>
`;
};

export default Candle;
