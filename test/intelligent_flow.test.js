
// ====================================================================
// |         지능형 데이터 조작을 통한 전체 흐름 테스트             |
// |   - 첫 호출에는 진입용 데이터, 두 번째 호출에는 정상 데이터를 반환  |
// ====================================================================
console.warn('🚨 지능형 흐름 테스트: 실제 주문이 발생합니다. 테스트 계정 사용을 권장합니다.');

// --- 데이터 조작(Mocking) 설정 ---
const originalUtil = require('../common/util.js');
const { consoleLogger: testLogger } = require('../common/logger.js');

// BTCUSDT 심볼에 대한 getKline 호출 횟수를 추적하기 위한 카운터
let btcKlineCallCount = 0;

const smartMockUtil = {
  ...originalUtil,
  getKline: (symbol, interval, limit) => {
    // BTCUSDT 심볼에 대해서만 데이터 조작
    if (symbol === 'BTCUSDT') {
      btcKlineCallCount++;
      // 1. 첫 번째 호출 (open 함수에서 진입 조건을 판단할 때)
      if (btcKlineCallCount === 1) {
        testLogger.info(`[Smart Mock] getKline 1번째 호출. 진입을 위해 조작된 데이터를 반환합니다.`);
        const fakeCandles = Array.from({ length: 125 }, (_, i) => 
          [Date.now() - (125 - i) * 60000, 30000 + i * 10, 30020 + i * 10, 29995 + i * 10, 30015 + i * 10, 100, 3000000]
        );
        fakeCandles[fakeCandles.length - 1][4] = 99999; // 볼린저밴드 상단 돌파 강제
        return Promise.resolve(fakeCandles);
      }
      // 2. 두 번째 이후 호출 (openOrderFilledCallback에서 익절가를 계산할 때)
      testLogger.info(`[Smart Mock] getKline ${btcKlineCallCount}번째 호출. 익절가 계산을 위해 정상 범위의 데이터를 반환합니다.`);
      const normalCandles = Array.from({ length: 125 }, (_, i) => {
        const price = 68000 + Math.sin(i / 10) * 100; // 변동성을 가진 현실적인 데이터
        return [Date.now() - (125-i)*60000, price, price+50, price-50, price, 100, 6800000]
      });
      return Promise.resolve(normalCandles);
    }
    // 다른 심볼에 대해서는 원래 함수를 호출
    return originalUtil.getKline(symbol, interval, limit);
  }
};
// require 캐시를 조작하여 Mock 객체를 주입
require.cache[require.resolve('../common/util.js')] = { exports: smartMockUtil };
// -------------------------------------


// --- main.js 로직 시작 ---
require('dotenv').config({ override: true });
const { ws_client } = require('../common/client');
const alogo2 = require('../alogs/alog2Class.js');
const { fileLogger, consoleLogger } = require('../common/logger.js');
const { auth } = require('../db/firebaseConfig.js');
const { signInWithEmailAndPassword } = require("firebase/auth");

const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];

async function testMainFlow() {
  // 1. Firebase 인증
  try {
    await signInWithEmailAndPassword(auth, process.env.FIREBASE_USER_EMAIL, process.env.FIREBASE_USER_PASSWORD);
    consoleLogger.info("Firebase 로그인 성공!");
  } catch (error) {
    consoleLogger.error("Firebase 인증 실패. 테스트를 중단합니다.", error);
    return;
  }

  // 2. algo2 객체 생성 및 초기화
  const alog2Objs = symbols.reduce((acc, symbol) => {
    acc[symbol] = new alogo2(symbol);
    return acc;
  }, {});
  await Promise.all(Object.values(alog2Objs).map(obj => obj.set()));

  // 3. 웹소켓 연결 및 이벤트 리스너 설정
  ws_client.subscribeV5('order', 'linear');
  await ws_client.connectWSAPI();

  ws_client.on('update', (res) => {
    if (res?.topic === "order") {
      const data = res?.data || [];
      data.forEach(element => {
        if (element.symbol && alog2Objs[element.symbol]) {
          consoleLogger.info(`[WebSocket Event] ${element.symbol}의 주문 업데이트 수신`);
          alog2Objs[element.symbol].orderEventHandle(element);
        }
      });
    }
  });

  ws_client.on('response', (response) => consoleLogger.log('Websocket Response:', response));
  ws_client.on('close', () => consoleLogger.warn('Websocket connection closed.'));
  ws_client.on('exception', (err) => consoleLogger.error('Websocket Exception:', err));

  // 4. 강제 진입을 위해 scheduleFunc 즉시 실행
  consoleLogger.info("--- [테스트] BTCUSDT 강제 진입을 위해 scheduleFunc를 즉시 실행합니다. ---");
  try {
    // BTCUSDT 객체에 대해서만 scheduleFunc 실행
    await alog2Objs['BTCUSDT'].scheduleFunc();
    consoleLogger.info("--- [테스트] 진입 주문 전송 시도 완료. 이제 웹소켓의 체결 이벤트를 기다립니다... ---");
  } catch (error) {
    consoleLogger.error("즉시 실행 중 오류 발생:", error);
  }

  // 60초 후 테스트 자동 종료
  setTimeout(() => {
    consoleLogger.info("--- 테스트 시간이 만료되어 자동으로 종료합니다. ---");
    process.exit(0);
  }, 60000);
}

testMainFlow();
