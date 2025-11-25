require('dotenv').config();

const {rest_client, ws_client, ws_api_client, WS_KEY_MAP} = require('./common/client');
const { v4: uuidv4 } = require('uuid');
const alogo2 = require('./alogs/alog2Class.js');
const { fileLogger, consoleLogger } = require('./common/logger.js'); // 로거 import
const cron = require('node-cron');

const { auth } = require('./db/firebaseConfig.js');
const { signInWithEmailAndPassword } = require("firebase/auth");


const symbols = ['SOLUSDT', 'XRPUSDT'];

const alog2Objs = symbols.reduce((acc, symbol) => {
  acc[symbol] = new alogo2(symbol);
  return acc;
}, {});


async function main(){//웹소켓 셋 및 스케줄링
    // --- 1. Firebase 인증 ---
  try {
    consoleLogger.info("Firebase 로그인을 시도합니다...");
    const email = process.env.FIREBASE_USER_EMAIL;
    const password = process.env.FIREBASE_USER_PASSWORD;
    await signInWithEmailAndPassword(auth, email, password);
    consoleLogger.info("Firebase 로그인 성공.");
  } catch (error) {
    consoleLogger.error("Firebase 로그인 실패:", error);
    process.exit(1); // 로그인 실패 시 프로세스 종료
  }


  await Promise.all(Object.values(alog2Objs).map(obj => obj.set()));



  // --- 타임아웃 시간 10분 ---
  const CRON_JOB_TIMEOUT_MS = 10 * 60 * 1000;
  const cronExpression = '1 0 */4 * * *';

  cron.schedule(cronExpression, () => {
    consoleLogger.info("4시간 캔들용 작업 실행");

    // 실제 작업 내용
    const mainTask = Promise.all(Object.values(alog2Objs).map(obj => obj.scheduleFunc()));

    // 타임아웃을 감시하는 프로미스
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`크론 작업 시간 초과! (${CRON_JOB_TIMEOUT_MS / 1000}초 이상 실행됨)`));
        }, CRON_JOB_TIMEOUT_MS);
    });

    // Promise.race
    Promise.race([mainTask, timeoutPromise])
        .then(() => {
            consoleLogger.info("4시간 캔들용 작업 완료");
        })
        .catch(error => {
            // mainTask의 오류 또는 타임아웃 오류
            consoleLogger.error('4시간 캔들용 작업 오류발생:', error);
            fileLogger.error('4시간 캔들용 작업 오류발생:', error);
        })
        .finally(() => {
            console.log(" ");
        });

  }, {
    timezone: 'UTC'
  });

  // cron.schedule('0 0 * * *', async () => { // 매일 23:59분 마다
  //   consoleLogger.info("=====================================================================")
  //   //하루 거래내역및 pnl 출력 추가 할 거
  // }, {
  //   timezone: 'UTC'
  // });

  ws_client.subscribeV5('order', 'linear');

  await ws_client.connectWSAPI();
}

main();

ws_client.on('update', async (res) => {
  try {
    if(res?.topic == "order"){
      const data = res?.data
      data.forEach(element => {
        const alog2ObjTemp = alog2Objs[element.symbol]
        if (alog2ObjTemp) {
            alog2ObjTemp.orderEventHandle(element)
        } else {
            consoleLogger.warn(`수신된 주문 이벤트의 심볼(${element.symbol})에 해당하는 객체를 찾을 수 없습니다.`);
        }
      });
    }
  } catch(e) {
    consoleLogger.error('ws_client \'update\' 이벤트 처리 중 오류 발생:', e);
    fileLogger.error('ws_client \'update\' 이벤트 처리 중 오류 발생:', e);
  }
});

// 연결이 닫혔을 때, 그 이유를 포함하여 로그를 남깁니다.
ws_client.on('close', (event) => {
  consoleLogger.warn('ws connection closed. Event:', event);
  fileLogger.warn('ws connection closed. Event:', event);
});

// 에러 발생 시, 상세한 에러 정보를 로그로 남깁니다.
ws_client.on('error', (err) => {
  consoleLogger.error('ws connection error:', err);
  fileLogger.error('ws connection error:', err);
});

ws_client.on('open', ({ wsKey, event }) => {
  consoleLogger.info(`ws connection open for ${wsKey}`);
});

ws_client.on('response', (response) => {
  // console.log('ws response: ', response);
});

// 재연결 시작 시, 파일에도 로그를 남깁니다.
ws_client.on('reconnect', ({ wsKey }) => {
  const reconnectMessage = `ws automatically reconnecting.... ${wsKey}`;
  consoleLogger.info(reconnectMessage);
  fileLogger.info(reconnectMessage);
});

// 재연결 성공 시, 파일에도 로그를 남깁니다.
ws_client.on('reconnected', ({ wsKey }) => {
  const reconnectedMessage = `ws has reconnected ${wsKey}`;
  consoleLogger.info(reconnectedMessage);
  fileLogger.info(reconnectedMessage);
});
