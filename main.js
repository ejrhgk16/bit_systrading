require('dotenv').config();

const {rest_client, ws_client, ws_api_client, WS_KEY_MAP} = require('../common/client');
const { v4: uuidv4 } = require('uuid');
const alogo2 = require('./alogs/alog2Class.js');
const { fileLogger, consoleLogger } = require('./common/logger.js'); // 로거 import
const cron = require('node-cron');

const alogo2_btc = new alogo2(symbol = 'BTCUSDT', decimalPlaces_qty = 1, decimalPlaces_price = 2);
const alogo2_eth = new alogo2(symbol = 'ETHUSDT', decimalPlaces_qty = 1, decimalPlaces_price = 2);
const alogo2_sol = new alogo2(symbol = 'SOLUSDT', decimalPlaces_qty = 1, decimalPlaces_price = 2);

const alog2Objs = {
  BTCUSDT : alogo2_btc,
  ETHUSDT : alogo2_eth,
  SOLUSDT : alogo2_sol,
}

await Promise.all(alogo2_btc.set(), alogo2_eth.set(), alogo2_sol.set())


async function main(){//웹소켓 셋 및 스케줄링

  
  cron.schedule('0 * * * *', async () => { // 매시간마다
    Promise.all(alogo2_btc.scheduleFunc(), alogo2_eth.scheduleFunc(), alogo2_sol.scheduleFunc())

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


  ws.on('close', () => {
    console.log('connection closed');
  });

  ws.on('exception', (err) => {
    console.error('exception', err);
  });

  ws.on('reconnect', ({ wsKey }) => {
    console.log('ws automatically reconnecting.... ', wsKey);
  });

  ws.on('reconnected', (data) => {
    console.log('ws has reconnected ', data?.wsKey);
  });
}


main();