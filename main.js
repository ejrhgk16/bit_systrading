require('dotenv').config();

const {rest_client, ws_client, ws_api_client, WS_KEY_MAP} = require('./common/client');
const { v4: uuidv4 } = require('uuid');
const alogo2 = require('./alogs/alog2Class.js');
const { fileLogger, consoleLogger } = require('./common/logger.js'); // 로거 import
const cron = require('node-cron');

const symbols = ['SOLUSDT', 'XRPUSDT'];

const { auth } = require('./db/firebaseConfig.js');
const { signInWithEmailAndPassword } = require("firebase/auth");


async function main(){//웹소켓 셋 및 스케줄링
    // --- 1. Firebase 인증 ---
  try {
    consoleLogger.info("Firebase 로그인을 시도합니다...");
    const email = process.env.FIREBASE_USER_EMAIL;
    const password = process.env.FIREBASE_USER_PASSWORD;
    await signInWithEmailAndPassword(auth, email, password);
    consoleLogger.info("Firebase 로그인 성공.");
  } catch (error) {
    consoleLogger.error(`Firebase 로그인 실패: ${error.message}`);
    process.exit(1); // 로그인 실패 시 프로세스 종료
  }

  const alog2Objs = symbols.reduce((acc, symbol) => {
    acc[symbol] = new alogo2(symbol);
    return acc;
  }, {});

  await Promise.all(Object.values(alog2Objs).map(obj => obj.set()));


  // 타임아웃 시간 (10분) ---
  const CRON_JOB_TIMEOUT_MS = 10 * 60 * 1000;

  cron.schedule('40 59 * * * *', () => {
    consoleLogger.info("cron 40 59 * * * * 실행");

    // 실제 작업 내용
    const mainTask = Promise.all(Object.values(alog2Objs).map(obj => obj.scheduleFunc()));

    // 타임아웃을 감시하는 프로미스
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`cron 40 59 * * * * 작업 시간 초과! (${CRON_JOB_TIMEOUT_MS / 1000}초 이상 실행됨)`));
        }, CRON_JOB_TIMEOUT_MS);
    });

    // Promise.race: 실제 작업과 타임아웃 중 먼저 끝나는 쪽을 따릅니다.
    Promise.race([mainTask, timeoutPromise])
        .then(() => {
            consoleLogger.info("cron 40 59 * * * * 완료");
        })
        .catch(error => {
            // mainTask의 오류 또는 타임아웃 오류가 여기로 들어옵니다.
            const errorMessage = `cron 40 59 * * * * 오류발생: ${error.stack || JSON.stringify(error)}`;
            consoleLogger.error(errorMessage);
            fileLogger.error(errorMessage);
        })

  }, {
    timezone: 'UTC'
  });

  cron.schedule('0 0 * * *', async () => { // 매일 23:59분 마다
    consoleLogger.info("=====================================================================")
    //하루 거래내역및 pnl 출력 추가 할 거
  }, {
    timezone: 'UTC'
  });

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
        }
      });
    }
  } catch(e) {
    fileLogger.error('update error', e);
  }
});

ws_client.on('close', () => {
  consoleLogger.info('ws connection closed');
});

ws_client.on('error', (err) => {
  consoleLogger.error('ws connection error: ', err);
});

ws_client.on('open', ({ wsKey, event }) => {
  consoleLogger.info('ws connection open for ', wsKey);
});

ws_client.on('response', (response) => {
  // console.log('ws response: ', response);
});

ws_client.on('reconnect', ({ wsKey }) => {
  consoleLogger.info('ws automatically reconnecting.... ', wsKey);
  fileLogger.info('ws automatically reconnecting.... ', wsKey);
});

ws_client.on('reconnected', ({ wsKey }) => {
  consoleLogger.info('ws has reconnected ', wsKey);
  fileLogger.info('ws has reconnected ', wsKey);

});
