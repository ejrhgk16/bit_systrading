
// --- 데이터/지표 조작(Mocking) 설정 ---
const originalUtil = require('../common/util.js');
const originalIndicator = require('../common/indicatior.js');
const { consoleLogger } = require('../common/logger.js');

// ====================================================================
// |     지표 조작(calculateBB)을 통한 가장 안정적인 흐름 테스트      |
// ====================================================================
consoleLogger.warn('🚨 최종 흐름 테스트: 실제 주문이 발생합니다. 테스트 계정 사용을 권장합니다.');

// // 1. getKline은 이제 현실적인 데이터를 반환합니다.
// const realisticMockUtil = {
//   ...originalUtil,
//   getKline: (symbol, interval, limit) => {
//     consoleLogger.debug(`[Realistic Mock] getKline 호출됨. 현실적인 시세 데이터를 반환합니다.`);
//     const normalCandles = Array.from({ length: 125 }, (_, i) => {
//         // SOLUSDT 가격대를 기준으로 현실적인 데이터 생성
//       const price = 160 + Math.sin(i / 10) * 2; 
//       return [Date.now() - (125 - i) * 60000, price, price + 0.5, price - 0.5, price, 100, 16000];
//     });
//     return Promise.resolve(normalCandles);
//   }
// };

// // 2. calculateBB 함수를 조작하여 진입 조건을 강제합니다.
// const indicatorCallCount = {};
// const smartMockIndicator = {
//   ...originalIndicator,
//   calculateBB: (data, period, stdDev, srcIndex) => {
//     const symbol = "SOLUSDT"; // 이 테스트는 SOLUSDT 강제 진입을 가정합니다.
    
//     indicatorCallCount[symbol] = (indicatorCallCount[symbol] || 0) + 1;

//     // 첫 번째 호출(open 함수)에서만 볼린저밴드를 조작합니다.
//     if (indicatorCallCount[symbol] === 1) {
//         consoleLogger.info(`[Smart Mock] calculateBB 1번째 호출. 진입을 위해 상단 밴드를 100으로 조작합니다.`);
//         return { upper: 1, middle: 0.5, lower: 0 }; // 상단 밴드를 매우 낮게 설정 (현재가보다 낮게)
//     }

//     // 그 이후의 호출에서는 원래 함수를 사용합니다.
//     consoleLogger.debug(`[Smart Mock] calculateBB ${indicatorCallCount[symbol]}번째 호출. 원래 로직을 실행합니다.`);
//     return originalIndicator.calculateBB(data, period, stdDev, srcIndex);
//   }
// };

// // require 캐시를 조작하여 Mock 객체 주입
// require.cache[require.resolve('../common/util.js')] = { exports: realisticMockUtil };
// require.cache[require.resolve('../common/indicatior.js')] = { exports: smartMockIndicator };
// // -------------------------------------

// --- main.js 로직 시작 ---
require('dotenv').config();
const { ws_client } = require('../common/client');
const alogo2 = require('../alogs/alog2Class.js');
const { fileLogger } = require('../common/logger.js');
const { auth } = require('../db/firebaseConfig.js');
const { signInWithEmailAndPassword } = require("firebase/auth");

// 사용자 요청에 따라 SOL, XRP만 테스트하도록 수정합니다.
const symbols = ["SOLUSDT", "XRPUSDT"];

async function testMainFlow() {
  // 1. Firebase 인증
  try {
    await signInWithEmailAndPassword(auth, process.env.FIREBASE_USER_EMAIL, process.env.FIREBASE_USER_PASSWORD);
    consoleLogger.info("Firebase 로그인 성공!");
  } catch (error) {
    consoleLogger.error('Firebase 인증 실패:', error); return; }

  // 2. algo2 객체 생성 및 초기화
  const alog2Objs = symbols.reduce((acc, symbol) => ({ ...acc, [symbol]: new alogo2(symbol) }), {});
  await Promise.all(Object.values(alog2Objs).map(obj => obj.set()));

  // 3. 웹소켓 연결 및 이벤트 리스너 설정
  ws_client.subscribeV5('execution', 'linear');
  ws_client.subscribeV5('order', 'linear');


  ws_client.on('update', (res) => {
    //console.log("update", res)
    
    if (res?.topic === "order") {
      
      (res?.data || []).forEach(element => {
        if (element.symbol && alog2Objs[element.symbol]) {
          consoleLogger.info(`[WebSocket Event] ${element.symbol} 주문 업데이트 수신`);
          alog2Objs[element.symbol].orderEventHandle(element);
        }
      });
    }
  });

  ws_client.on('response', (response) => {
    consoleLogger.info('Websocket Response:', response)
    if(response?.req_id=="execution,order"){
      try {
        consoleLogger.info("--- [테스트] SOLUSDT 강제 진입을 위해 scheduleFunc를 즉시 실행합니다. ---");
        alog2Objs['SOLUSDT'].open_test();
        consoleLogger.info("--- [테스트] 진입 주문 전송 시도 완료. 웹소켓 체결 이벤트를 기다립니다... ---");
      } catch (error) {
        consoleLogger.error('즉시 실행 중 오류 발생:', error);
      }
    }

});
  ws_client.on('close', () => consoleLogger.warn('Websocket connection closed.'));
  ws_client.on('exception', (err) => consoleLogger.error('Websocket Exception:', err));
  await ws_client.connectWSAPI();
  // 4. 강제 진입을 위해 SOLUSDT의 scheduleFunc 즉시 실행


  // 90초 후 테스트 자동 종료
  setTimeout(() => {
    consoleLogger.info("--- 테스트 시간이 만료되어 자동으로 종료합니다. ---");
    process.exit(0);
  }, 90000);
}

testMainFlow();
