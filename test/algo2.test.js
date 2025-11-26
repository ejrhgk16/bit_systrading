
require('dotenv').config({ override: true });
const { signInWithEmailAndPassword } = require("firebase/auth");
const { auth } = require('../db/firebaseConfig.js');
const { ws_client } = require('../common/client');
const { consoleLogger } = require('../common/logger.js');

// --- Mocking Section ---
// 시세 데이터(getKline)만 가짜 함수로 대체하여 진입 조건을 강제로 만듭니다.
const mockUtil = {
  getKline: (symbol, interval, limit) => {
    consoleLogger.debug(`[Mock Data] getKline called for ${symbol}. 진입 조건을 강제하기 위해 조작된 데이터를 반환합니다.`);
    const fakeCandles = Array.from({ length: 125 }, (_, i) => {
      const basePrice = 30000;
      const open = basePrice + i * 10;
      const high = open + 20;
      const low = open - 5;
      const close = high - 2; 
      return [Date.now() - (125 - i) * 60000, open, high, low, close, 100, 3000000];
    });
    // 마지막 캔들 가격을 매우 높게 설정하여 볼린저 밴드 상단을 무조건 돌파하게 만듭니다.
    fakeCandles[fakeCandles.length - 1][4] = 99999;
    return Promise.resolve(fakeCandles);
  }
};

// alogo2Class가 require하는 모듈 중 getKline만 Mock으로 교체합니다.
// ws_client는 실제 객체를 그대로 사용합니다.
require.cache[require.resolve('../common/util')] = { exports: { getKline: mockUtil.getKline } };

// alogo2Class는 Mocking 설정 후에 require해야 합니다.
const alogo2 = require('../alogs/alog2Class.js');

// --- Test Runner Section ---

async function runHybridTestScenario() {
  consoleLogger.info('--- Algo2 Hybrid Test Start ---');
  consoleLogger.warn('🚨 중요: 이 테스트는 실제 Bybit API를 호출하여 주문을 전송합니다. 테스트 계정 사용을 권장합니다.');

  // --- 사전 준비: Firebase 및 WebSocket 연결 ---
  try {
    await signInWithEmailAndPassword(auth, process.env.FIREBASE_USER_EMAIL, process.env.FIREBASE_USER_PASSWORD);
    consoleLogger.info("Firebase 로그인 성공!");
    ws_client.subscribeV5('order', 'linear');
    await ws_client.connectWSAPI();
    consoleLogger.info('Bybit WebSocket 연결 성공!');
  } catch (error) {
    consoleLogger.error('사전 준비 실패. 테스트를 중단합니다:', error);
    return;
  }

  const testSymbol = 'BTCUSDT';
  const algoInstance = new alogo2(testSymbol);

  // --- 1단계: 초기화 ---
  consoleLogger.info('\n--- STEP 1: Initialization ---');
  await algoInstance.set();
  consoleLogger.info(`초기 상태 확인:`, { positionType: algoInstance.positionType, isOpenOrderFilled: algoInstance.isOpenOrderFilled });

  // --- 2단계: 강제 진입 (실제 API 호출) ---
  consoleLogger.info('\n--- STEP 2: 강제 진입 (실제 시장가 주문 API 호출) ---');
  await algoInstance.scheduleFunc();
  consoleLogger.info(`시장가 매수 주문(${algoInstance.orderId_open})을 Bybit에 전송했습니다. (API 응답은 별도 확인)`);

  // --- 3단계: 진입 주문 체결 시뮬레이션 (실제 API 호출) ---
  consoleLogger.info('\n--- STEP 3: 진입 체결 시뮬레이션 (실제 익절 주문 API 호출) ---');
  const openOrderFillEvent = { orderStatus: 'Filled', orderLinkId: algoInstance.orderId_open };
  await algoInstance.orderEventHandle(openOrderFillEvent);
  consoleLogger.info(`익절 주문 2개(${algoInstance.orderId_exit_1}, ${algoInstance.orderId_exit_2})를 Bybit에 전송했습니다.`);
  consoleLogger.info(`진입 체결 후 상태 확인:`, { isOpenOrderFilled: algoInstance.isOpenOrderFilled, isPartialExit: algoInstance.isPartialExit });

  
  // --- 4단계: 1차 익절 주문 체결 시뮬레이션 ---
  consoleLogger.info('\n--- STEP 4: 1차 익절 체결 시뮬레이션 ---');
  const exit1OrderFillEvent = { orderStatus: 'Filled', orderLinkId: algoInstance.orderId_exit_1 };
  await algoInstance.orderEventHandle(exit1OrderFillEvent);
  consoleLogger.info(`1차 익절 후 상태 확인:`, { isPartialExit: algoInstance.isPartialExit });

  // --- 5단계: 최종 익절 주문 체결 및 리셋 시뮬레이션 ---
  consoleLogger.info('\n--- STEP 5: 최종 익절 및 리셋 시뮬레이션 ---');
  const exit2OrderFillEvent = { orderStatus: 'Filled', orderLinkId: algoInstance.orderId_exit_2 };
  await algoInstance.orderEventHandle(exit2OrderFillEvent);
  consoleLogger.info(`최종 익절 후 상태 확인 (리셋 완료):`, { positionType: algoInstance.positionType, isOpenOrderFilled: algoInstance.isOpenOrderFilled, isPartialExit: algoInstance.isPartialExit });

  // --- 테스트 종료 ---
  const testDuration = 5000; // 5초 후 종료
  consoleLogger.info(`\n${testDuration / 1000}초 후에 테스트를 자동으로 종료합니다.`);
  setTimeout(() => {
    consoleLogger.info('--- Algo2 Hybrid Test End ---');
    process.exit(0);
  }, testDuration);
}

runHybridTestScenario();
