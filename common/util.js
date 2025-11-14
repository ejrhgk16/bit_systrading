const {rest_client} = require('./client');

async function getWeeklyOpen(symbol){
    try {
      const response = await rest_client.getKline({
        category: 'linear',
        symbol: symbol,
        interval: 'W',
        limit: 1, // 6개의 데이터를 요청
      });
    
      if (response.retCode === 0 && response.result && response.result.list && response.result.list.length >= 1) {
        const candles = response.result.list;
    
        // 현재 주 정보 출력 (기존 로직)
        const latestCandle = candles[0];
        const [startTime, openPrice] = latestCandle;// [타임스탬프,    시가,     고가,     저가,     종가,    ...],
  
        return openPrice
  
      } else {
        const dataPointCount = response.result && response.result.list ? response.result.list.length : 0;
        console.error(`Failed to fetch enough kline data for MA calculation. Need 6 data points, but got ${dataPointCount}.`);
        console.error('API Response Message:', response.retMsg);
      }
    
    } catch (error) {
      console.error('An error occurred:', error);
    }
    
  
  
  }
  
  async function getWeeklyMovingAverage(symbol, limit) {
    try {
      console.log('Fetching weekly kline data for moving average...');
  
      // 5주 이동평균을 위해 최근 6개의 주봉 데이터를 요청합니다.
      const response = await rest_client.getKline({
        category: 'linear',
        symbol: symbol,
        interval: 'W',
        limit: limit+1, // 6개의 데이터를 요청
      });
  
      // 충분한 데이터가 있는지 확인 (최소 6개)
      if (response.retCode === 0 && response.result && response.result.list && response.result.list.length >= limit) {
  
        const candles = response.result.list;      // [타임스탬프,    시가,     고가,     저가,     종가,    ...],
        const previousCandles = candles.slice(1, limit+1);
  
        // 각 캔들의 종가(index 4)를 추출하여 숫자로 변환합니다.
        const closingPrices = previousCandles.map(candle => parseFloat(candle[4]));
  
        // 5개 종가의 합계를 구합니다.
        const sumOfCloses = closingPrices.reduce((total, price) => total + price, 0);//((누적값, 현재값) -> 반환값, 누적 초기값)
  
        // 이동평균을 계산합니다.
        const movingAverage = sumOfCloses / limit;
  
        console.log(`Calculation based on previous 5 weeks.`);
        console.log(`Closing prices used: [${closingPrices.join(', ')}]`);
        console.log(`5-Week Moving Average: ${movingAverage.toFixed(2)}`); // 소수점 2자리까지 표시
  
        return movingAverage
  
      } else {
        const dataPointCount = response.result && response.result.list ? response.result.list.length : 0;
        console.error(`Failed to fetch enough kline data for MA calculation. Need 6 data points, but got ${dataPointCount}.`);
        console.error('API Response Message:', response.retMsg);
      }
    } catch (error) {
      console.error('An error occurred:', error);
    }
  }
  
  async function getWeeklyOpenCloseDifference(symbol, limit) {
    try {
      console.log('Fetching weekly kline data for moving average...');
  
      // 5주 이동평균을 위해 최근 6개의 주봉 데이터를 요청합니다.
      const response = await rest_client.getKline({
        category: 'linear',
        symbol: symbol,
        interval: 'W',
        limit: limit+1, // 6개의 데이터를 요청
      });
  
      // 충분한 데이터가 있는지 확인 (최소 6개)
      if (response.retCode === 0 && response.result && response.result.list && response.result.list.length >= limit) {
        
        const candles = response.result.list;      // [타임스탬프,    시가,     고가,     저가,     종가,    ...],
        const previousCandles = candles.slice(1, limit+1);
  
        const sumOfDifferences = previousCandles.reduce((sum, candle) => {
          const openPrice = parseFloat(candle[1]);
          const closePrice = parseFloat(candle[4]);
            return sum + Math.abs(closePrice - openPrice);
          }, 0); 
        // 평균을 계산합니다.
        const average = sumOfDifferences / limit;
  
  
        return average
  
      } else {
        const dataPointCount = response.result && response.result.list ? response.result.list.length : 0;
        console.error(`Failed to fetch enough kline data for MA calculation. Need 6 data points, but got ${dataPointCount}.`);
        console.error('API Response Message:', response.retMsg);
      }
    } catch (error) {
      console.error('An error occurred:', error);
    }
  }
  
  
  /**
   * 지정된 주(week)의 금요일 날짜를 'DDMMMYY' 형식으로 반환합니다.
   * @param {number} weekOffset - 0: 이번 주, 1: 다음 주, 2: 다다음 주, ...
   * @returns {string} - 예: '13SEP24'
   */
  function getFridayFormatted(weekOffset = 0) {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
  
    // 목표 금요일까지의 날짜 차이를 계산합니다.
    // (5 - dayOfWeek) => 이번 주 금요일까지의 날짜 차이 (음수 가능)
    // (7 * weekOffset) => 목표 주까지의 날짜 차이
    const daysToAdd = (5 - dayOfWeek) + (7 * weekOffset);
  
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + daysToAdd);
  
    // --- 아래는 이전과 동일한 포맷팅 로직 ---
  
    // 1. 일(DD) 구하기 (두 자리로 맞춤)
    const day = String(targetDate.getDate()).padStart(2, '0');
  
    // 2. 월(MMM) 구하기 (영어 3글자 대문자)
    const monthAbbreviations = [
      'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
    ];
    const month = monthAbbreviations[targetDate.getMonth()];
  
    // 3. 연도(YY) 구하기 (뒤의 두 자리)
    const year = String(targetDate.getFullYear()).slice(-2);
  
    return `${day}${month}${year}`;
  }
  
  /**
   * 특정 만기일에 대한 모든 행사가를 가져옵니다.
   * @param {string} baseCoin - 예: 'BTC', 'ETH'
   * @param {string} expirationDate - 예: '13SEP24'
   * @returns {Promise<number[] | null>} - 정렬된 행사가 목록 또는 null
   */
  async function getStrikes(baseCoin, expirationDate) {
      try {
          console.log(`${baseCoin}-${expirationDate} 만기일의 행사가를 조회합니다...`);
          const response = await rest_client.getTickers({
              category: 'option',
              baseCoin : baseCoin,
              expDate : expirationDate
          });
          // console.log(response.result.list)
  
          if (response.retCode === 0 && response.result && response.result.list) {
              const strikes = new Set();
              response.result.list.forEach(item => {
                  // 티커 형식: BTC-12SEP25-109500-P-USDT
                  const parts = item.symbol.split('-');
                  if (parts.length === 5 && parts[1] === expirationDate) {
                      strikes.add(parseFloat(parts[2]));
                  }
              });
  
              if (strikes.size === 0) {
                  console.warn(`경고: ${expirationDate} 만기일에 해당하는 옵션이 없습니다.`);
                  return [];
              }
              
              const sortedStrikes = Array.from(strikes).sort((a, b) => a - b); 
              console.log(`조회된 행사가 수: ${sortedStrikes.length}`);
              return sortedStrikes;
          } else {
              console.error('옵션 티커 정보를 가져오는데 실패했습니다:', response.retMsg); 
              return null;
          }
      } catch (error) {
          console.error('getStrikePrices 함수에서 오류 발생:', error);
          return null;
      }
  }  
  
  /**
   * 주어진 가격(targetPrice)과 가장 가까운 행사가를 배열에서 찾아 반환합니다.
   *
   * @param {number} targetPrice - 기준이 되는 특정 가격.
   * @param {number[]} strikePrices - 전체 행사가 목록.
   * @returns {number | null} - 가장 가까운 행사가. 행사가 목록이 비어있으면 null을 반환합니다.
   */
  function findClosestStrike(targetPrice, strikePrices) {
    if (!strikePrices || strikePrices.length === 0) {
      console.error("행사가 목록(strikePrices)이 비어있습니다.");
      return null;
    }
  
    // reduce를 사용하여 가장 차이가 적은 값을 찾습니다.
    const closest = strikePrices.reduce((prev, curr) => {
      // 현재 값과 타겟의 차이가 이전 값과 타겟의 차이보다 작으면 현재 값을 채택
      return (Math.abs(curr - targetPrice) < Math.abs(prev - targetPrice) ? curr : prev);
    });
  
    return closest;
  }
  

/**
 * K-line (캔들) 데이터를 가져와서 오래된 순으로 정렬하여 반환합니다.
 * @param {string} symbol - 예: 'BTCUSDT'
 * @param {string} interval - 캔들 간격. 예: 'D' (일봉), 'W' (주봉)
 * @param {number} limit - 가져올 캔들 수
 * @returns {Promise<Array|null>} - 캔들 데이터 배열 (오래된 순) 또는 실패 시 null
 */
async function getKline(symbol, interval, limit) {
  try {
    const response = await rest_client.getKline({
      category: 'linear',
      symbol: symbol,
      interval: interval,
      limit: limit,
    });

    if (response.retCode === 0 && response.result && response.result.list && response.result.list.length > 0) {
      return response.result.list.reverse(); // 오래된 데이터가 앞에 오도록 뒤집음
    } else {
      console.error(`K-line 데이터를 가져오지 못했습니다 for ${symbol}. 필요한 데이터 수: ${limit}, 받은 데이터 수: ${response.result?.list?.length || 0}`);
      console.error('API 응답 메시지:', response.retMsg);
      return null;
    }
  } catch (error) {
    console.error('K-line 데이터 조회 중 오류 발생:', error);
    return null;
  }
}

module.exports = {
    getKline,
    getWeeklyOpen,
    getWeeklyMovingAverage,
    getWeeklyOpenCloseDifference,
    getFridayFormatted,
    getStrikes,
    findClosestStrike,
};