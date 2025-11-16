require('dotenv').config();

const {rest_client, ws_client, ws_api_client, WS_KEY_MAP} = require('./common/client');
const { v4: uuidv4 } = require('uuid');
const alogo2 = require('./alogs/alog2Class.js');
const { fileLogger, consoleLogger } = require('./common/logger.js'); // 로거 import
const cron = require('node-cron');

const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];

const { auth } = require('./db/firebaseConfig.js');
const { signInWithEmailAndPassword } = require("firebase/auth");


async function main(){//웹소켓 셋 및 스케줄링
    // --- 1. Firebase 인증 ---
  try {
    consoleLogger.info("Firebase 로그인을 시도합니다...");
    const email = process.env.FIREBASE_USER_EMAIL;
    const password = process.env.FIREBASE_USER_PASSWORD;

    if (!email || !password) {
      throw new Error("FIREBASE_USER_EMAIL과 FIREBASE_USER_PASSWORD를 .env 파일에 설정해야 합니다.");
    }
    
    // 이메일과 비밀번호로 로그인을 시도
    await signInWithEmailAndPassword(auth, email, password);
    consoleLogger.info("Firebase 로그인에 성공했습니다!");

  } catch (error) {
    consoleLogger.error("Firebase 인증에 실패했습니다. .env 파일과 Firebase 프로젝트 설정을 확인해주세요.", error);
    process.exit(1); // 인증에 실패하면 앱을 종료합니다.
  }

  const alog2Objs = symbols.reduce((acc, symbol) => {
    acc[symbol] = new alogo2(symbol);
    return acc;
  }, {});
  
  await Promise.all(Object.values(alog2Objs).map(obj => obj.set()));  

  
  cron.schedule('0 * * * *', async () => { // 매시간마다
    try {
      consoleLogger.info("cron 0 * * * * 실행");
      await Promise.all(Object.values(alog2Objs).map(obj => obj.scheduleFunc()));
      consoleLogger.info("cron 0 * * * * 완료");
    }catch (error) {
      // scheduleFunc 중 하나라도 실패하면 에러가 여기서 잡힙니다.
      consoleLogger.error("cron 0 * * * * 오류발생:", error);
      fileLogger.error("cron 0 * * * * 오류발생:", error);
    }
  }, {
    timezone: 'UTC'
  });

  cron.schedule('59 23 * * *', async () => { // 매일 00:01 분 마다
    consoleLogger.info("=====================================================================")
  }, {
    timezone: 'UTC'
  });

  
  // Or one at a time
  // ws.subscribeV5('tickers.BTCUSDT', 'linear');
  // ws_client.subscribeV5('tickers.ETHUSDT', 'linear');
  ws_client.subscribeV5('order', 'linear');
  
  await ws_client.connectWSAPI();

  ws_client.on('update', async (res) => {

    //res.data 배열임

    if(res?.topic == "order"){
      const data = res.data // 배열
      data.array.forEach(element => {

        const symbol = element.symbol
        const alog2ObjTemp = alog2Objs[symbol]
        alog2ObjTemp.orderEventHandle(element)
        
      });

    }

  });

  ws_client.on('open', ({ wsKey, event }) => {
    console.log('connection open for websocket with ID: ', wsKey);
  });


  ws_client.on('response', (response) => {
    console.log('response', response);
  });


  ws_client.on('close', () => {
    console.log('connection closed');
  });

  ws_client.on('exception', (err) => {
    console.error('exception', err);
  });

  ws_client.on('reconnect', ({ wsKey }) => {
    console.log('ws automatically reconnecting.... ', wsKey);
  });

  ws_client.on('reconnected', (data) => {
    console.log('ws has reconnected ', data?.wsKey);
  });
}


main();