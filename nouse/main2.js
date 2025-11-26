require('dotenv').config({ override: true });

const { WebsocketClient, WS_KEY_MAP} = require('bybit-api');
const { v4: uuidv4 } = require('uuid');
const status2 = require('../status2.js');
const { client, getWeeklyOpen, getWeeklyMovingAverage, getWeeklyOpenCloseDifference, getFridayFormatted, getStrikes, findClosestStrike } = require('../common/util.js');

const ws = new WebsocketClient({
  key: process.env.BYBIT_API_KEY,
  secret: process.env.BYBIT_API_SECRET,
});

const status = status2

async function main2(){
    // await set('BTC');
    await set('ETH');
    //await set('SOL');
    console.log(JSON.stringify(status, null, 2));
    setWebsocket()
}

async function set(productType){
    console.log(`${productType} 설정을 시작합니다...`);
  
    const symbol = `${productType}USDT`;
  
    // 1. 주간 데이터 비동기 호출
    const weeklyOpen = await getWeeklyOpen(symbol);
    const sma_w_5 = await getWeeklyMovingAverage(symbol, 5); 
    const sma_w_10 = await getWeeklyMovingAverage(symbol, 10);
    const open_close_differ_avg = await getWeeklyOpenCloseDifference(symbol, 7);
  
    // API 호출 실패 시 중단
    if (weeklyOpen === null || sma_w_5 === null || sma_w_10 === null || open_close_differ_avg === null) {
      console.error(`${productType} 데이터 조회에 실패하여 설정을 중단합니다.`);
      return;
    }
  
    const productStatus = status[productType];
  
    // 2. status 객체 업데이트
    productStatus.open = parseFloat(parseFloat(weeklyOpen).toFixed(2));
    productStatus.x = parseFloat((open_close_differ_avg).toFixed(2));
    productStatus.x_half = parseFloat((open_close_differ_avg * 0.3).toFixed(2));
    productStatus.isLong = sma_w_5 > sma_w_10;
    productStatus.positionType = productStatus.isLong ? 'C' : 'P'
    
    // isLong 값에 따라 break_price 결정
    if (productStatus.isLong) {
      productStatus.break_price = parseFloat((productStatus.open + productStatus.x_half).toFixed(2));
      productStatus.target_price = productStatus.break_price + productStatus.x - productStatus.x_half
      console.log(`롱 포지션 설정. break_price: ${productStatus.break_price}`)
    } else {
      productStatus.break_price = parseFloat((productStatus.open - productStatus.x_half).toFixed(2));
      productStatus.target_price = productStatus.break_price - (productStatus.x - productStatus.x_half)
      console.log(`숏 포지션 설정. break_price: ${productStatus.break_price}`)
    }
  
    // 3. 옵션 행사가 및 심볼 계산
    const expirationDate = getFridayFormatted(1); // 다음 주 금요일
    const strikeList = await getStrikes(productType, expirationDate);
  
    if (strikeList && strikeList.length > 0) {
      // break_price에 가장 가까운 행사가를 찾음
      const closestStrike_buy = findClosestStrike(productStatus.break_price, strikeList);
      const closestStrike_sell = findClosestStrike(productStatus.target_price, strikeList);
  
      const positionType = productStatus.positionType
  
      productStatus.symbol_buy = `${productType}-${expirationDate}-${closestStrike_buy}-${positionType}-USDT`;
      productStatus.symbol_sell = `${productType}-${expirationDate}-${closestStrike_sell}-${positionType}-USDT`; 
  
  
    } else {
      console.error(`${expirationDate} 만기일에 대한 행사가 정보를 가져올 수 없어 심볼을 설정할 수 없습니다.`);
    }
    
    // 다른 코인들 로직은 일단 중략...
  }
  
  
  
  
  
  async function setWebsocket(){
  
    // Or one at a time
    // ws.subscribeV5('tickers.BTCUSDT', 'linear');
    ws.subscribeV5('tickers.ETHUSDT', 'linear');

    await ws.connectWSAPI();
  
    // Private/public topics can be used in the same WS client instance, even for
    // different API groups (linear, options, spot, etc)
    // ws.subscribeVV5('position', 'linear');
    // ws.subscribeV5('publicTrade.BTC', 'option');
  
    /**
     * The Websocket Client will automatically manage all connectivity & authentication for you.
     *
     * If a network issue occurs, it will automatically:
     * - detect it,
     * - remove the dead connection,
     * - replace it with a new one,
     * - resubscribe to everything you were subscribed to.
     *
     * When this happens, you will see the "reconnected" event.
     */
  
    // Listen to events coming from websockets. This is the primary data source
    ws.on('update', async (res) => {
      console.log('data received', JSON.stringify(res, null, 2));
      await tickersEventHandle(res)
  
      // if((res?.topic)?.indexOf("tickers") > -1){
      //   await tickersEventHandle(res)
      // }
  
    });
  
    // Optional: Listen to websocket connection open event
    // (automatic after subscribing to one or more topics)
    ws.on('open', ({ wsKey, event }) => {
      console.log('connection open for websocket with ID: ', wsKey);
    });
  
    // Optional: Listen to responses to websocket queries
    // (e.g. the response after subscribing to a topic)
    ws.on('response', (response) => {
      console.log('response', response);
    });
  
    // Optional: Listen to connection close event.
    // Unexpected connection closes are automatically reconnected.
    ws.on('close', () => {
      console.log('connection closed');
    });
  
    // Listen to raw error events. Recommended.
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
  
  async function tickersEventHandle(res){
    //옵션데이터 받은 로직이랑 - mark price 업데이트, 주문 체결 안료안될시 수정주문
    //선물데이터 받은 로직이랑 구분해야할듯 - break감지, targetprice감지, 신규주문 요청, 청산주문요청
  
    let productStatus = null
  
    if(res?.data?.symbol == "BTCUSDT"){
      productStatus = status['BTC']
  
    }
    else if(res?.data?.symbol == "ETHUSDT"){
      productStatus = status['ETH']
    }
    else if(res?.data?.symbol == "SOLUSDT"){
      productStatus = status['SOL']
    }
  
    let current_price = null;
  
    if (res?.data?.bid1Price) {
      current_price = res.data.bid1Price;
    } else if (res?.data?.ask1Price) {
      current_price = res.data.ask1Price;
    }
  
    if(current_price == null || productStatus == null){
      return;
    }
  
    switch (productStatus?.position_status) {
      case 0: //진입대기중
        
        // if(productStatus.isLong && current_price <= productStatus.break_price){
        //   return;
        // }
        // if(!productStatus.isLong && current_price >= productStatus.break_price){
        //   return;
        // }
  
        productStatus.position_status = 1
  
        ws.sendWSAPIRequest(WS_KEY_MAP.v5PrivateTrade, 'order.create', {
          symbol: productStatus.symbol_buy,
          side: 'Buy',
          orderType: 'Limit',
          price: '100',
          qty: (productStatus.unit*2).toString(),
          category: 'option',
          orderLinkId : uuidv4(),
        }).catch((e) => console.error('Order submit exception Buy: ', e));
      
        ws.sendWSAPIRequest(WS_KEY_MAP.v5PrivateTrade, 'order.create', {
          symbol: productStatus.symbol_sell,
          side: 'Sell',
          orderType: 'Limit',
          price: '200',
          qty: (productStatus.unit*2).toString(),
          category: 'option',
          orderLinkId : uuidv4(),
        }) .catch((e) => console.error('Order submit exception Sell: ', e));
      
        return;
    
      case 2: //진입체결완료된 상태 1차 목표가 도달대기중
        console.log("status 2")
  
        if(productStatus.isLong && current_price <= productStatus.target_price){
          return;
        }
        if(!productStatus.isLong && current_price >= productStatus.target_price){
          return;
        }
        //청산주문 
        ws.sendWSAPIRequest(WS_KEY_MAP.v5PrivateTrade, 'order.create', {
          symbol: productStatus.symbol_buy,
          side: 'Buy',
          orderType: 'Limit',
          price: (productStatus.markPrice_buy).toString(),
          qty: (productStatus.unit).toString(),
          category: 'option',
          orderLinkId : uuidv4(),
          reduceOnly : true
        }).catch((e) => console.error('Order submit exception Buy: ', e));
      
        ws.sendWSAPIRequest(WS_KEY_MAP.v5PrivateTrade, 'order.create', {
          symbol: productStatus.symbol_sell,
          side: 'Sell',
          orderType: 'Limit',
          price: (productStatus.markPrice_buy).toString(),
          qty: (productStatus.unit).toString(),
          category: 'option',
          orderLinkId : uuidv4(),
          reduceOnly : true
        }) .catch((e) => console.error('Order submit exception Sell: ', e));
      
        return;
  
    }
  
  }
  
  
  
  async function orderEventHandle(res){
    let productStatus = null
    const dataArr = res?.data
  
    if((res?.data?.symbol)?.indexOf("BTC") > -1){
      productStatus = status['BTC']
    }
    else if((res?.data?.symbol)?.indexOf("ETH") > -1){
      productStatus = status['ETH']
    }
    else if((res?.data?.symbol)?.indexOf("SOL") > -1){
      productStatus = status['SOL']
    }
  
    switch (productStatus) {
      case 1:
        dataArr.forEach((data)=>{////orderId key값을통해 계속 최신화 되도록
          productStatus['orderListObj_open'][data.orderId] = data
        })
  
  
        return;
      
      case 3:
        
        break;
    
      default:
        break;
    }
  
  }
  