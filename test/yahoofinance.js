import dotenv from 'dotenv';
dotenv.config();
import YahooFinance from 'yahoo-finance2';
import { sendTelegram, setMsgFormat } from '../common/util.js';
import { calculateRSI } from '../common/indicatior.js';

const yahooFinance = new YahooFinance();

const main = async () => {
  // RSI 계산을 위해 충분한 데이터를 가져오도록 기간을 30일로 설정
  const queryOptions = {
    period1: new Date(new Date().setDate(new Date().getDate() - 30)),
    period2: new Date(),
    interval: '1d',
  };

  try {
    const results = await yahooFinance.historical('^SPX', queryOptions);
    console.log(`Fetched ${results.length} days of data from Yahoo Finance.`);

    // indicatior 함수들이 요구하는 배열 형식으로 데이터를 변환합니다.
    // [timestamp, open, high, low, close, volume]
    const candles = results.map(r => [
      r.date.getTime(),
      r.open,
      r.high,
      r.low,
      r.close,
      r.volume
    ]);

    // RSI 계산 (14일 기준, 현재 값)
    const rsi = calculateRSI(candles, 14, 0);
    console.log('Calculated RSI:', rsi);

    // 텔레그램으로 보낼 메시지 구성
    const dataToSend = {
      symbol: '^SPX',
      latest_close: results[results.length - 1].close,
      rsi: rsi
    };

    const message = setMsgFormat(dataToSend, 'SPX Data with RSI');
    await sendTelegram(message);

    console.log('Successfully sent data with RSI to Telegram.');
  } catch (error) {
    console.error('An error occurred:', error);
    const errorMessage = setMsgFormat({ error: error.message }, 'Error Occurred');
    await sendTelegram(errorMessage);
  }
};

main();
