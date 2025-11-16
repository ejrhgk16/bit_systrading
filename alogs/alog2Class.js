//전략 : 변동성(볼밴)
const {rest_client, ws_client, ws_api_client, WS_KEY_MAP} = require('../common/client');
const {calculateDMI, calculateBB, calculateEMA} = require('../common/indicatior');
const {getKline} = require('../common/util');
require('dotenv').config();
const {getTradeStatus, setTradeStatus, addTradeLog } = require('../db/firestoreFunc.js');
const {fileLogger, consoleLogger} = require('../common/logger')

class alogo2{

    constructor(symbol) {

        this.qtyMultiplier = 0// 수량설정을 위한 소수점 자릿수에 따른 승수
        this.priceMultiplier = 0

        this.symbol = symbol;
        this.capital = 0.0;// 할당된 자금 설정필요
        
        this.leverage = 0.0;//계산필요 - 손절가에 못나가도 그냥 포지션 터지게

        this.orderSize = 0.0 // 주문 수량

        this.orderPrice = 0.0;


        this.exit_price_1 = 0.0
        this.exit_price_2 = 0.0

        this.exit_size_1 = 0.0; //1차 청산 물량
        this.exit_size_2 = 0.0; //2차 청산 물량

        this.orderId_open = null//링크아이디로내가 설정해서 저장
        this.orderId_exit_1 = null//링크아이디로내가 설정해서 저장
        this.orderId_exit_2 = null//링크아이디로내가 설정해서 저장

        this.positionType = null;//long short null
        this.isOpenOrderFilled = false
        this.isPartialExit = false;// 부분익절 여부

        this.entry_allow = false //볼밴 돌파상태, adx20이상, ema 5, 10


        
        //this.isOverAdx30 = false

        // this.#leverage = 0.0; 퍼블릭 안되게
    }

    async set(){
        
        const decimalPlaces_qty = Number(process.env[this.symbol+"_decimal_qty"])
        const decimalPlaces_price = Number(process.env[this.symbol+"_decimal_price"])

        this.qtyMultiplier = Math.pow(10, decimalPlaces_qty); // 수량설정을 위한 소수점 자릿수에 따른 승수
        this.priceMultiplier = Math.pow(10, decimalPlaces_price)

        this.orderId_open = 'algo2_'+this.symbol+'_open'
        this.orderId_exit_1 = 'algo2_'+this.symbol+'_exit_1'
        this.orderId_exit_2 = 'algo2_'+this.symbol+'_exit_2'

        this.capital = Number(process.env["algo2_"+this.symbol+"_capital"])

        const docId = this.getTradeStatusDocId();
        const data = await getTradeStatus(docId)
        if(data){
            Object.assign(this, data);
            await this.doubleCheckStatus()
        }else{
            const alog2State = { ...this };
            await setTradeStatus(docId, alog2State)
            
        }
        consoleLogger.info(this.symbol + ' 초기 설정 완료')
        
    }


    async open(){//포지션 타입, 스탑로스 계산 -> 주문 // 포지션 없는경우 반복실행되어야함

    
        const data_60m = await getKline(this.symbol, '60', 125)

        const latestCandle = data_60m[data_60m.length - 1];
        const current_close = latestCandle[4];

        const bbObj =  calculateBB(data_60m, 120, 1, 1);

        const adxObj = calculateDMI(data_60m, 14, 1);
        const ema_5 = calculateEMA(data_60m, 5, 1);
        const ema_10 = calculateEMA(data_60m, 10, 1);

        //포지션타입계산 및 entry_allow 계산
        if(current_close > bbObj.upper){

            if(adxObj.adx > 20 && current_close > ema_5 && current_close > ema_10){
                this.entry_allow = true
                this.positionType = 'long'
            } 

        }else if(current_close < bbObj.lower){
            
            if(adxObj.adx > 20 && current_close < ema_5 && current_close < ema_10){
                this.entry_allow = true
                this.positionType = 'short'
            }

        }else{
            this.positionType = null
        }

        consoleLogger.info(`${this.symbol} -- current_close : ${current_close}, positionType : ${this.positionType}, entry_allow : ${this.entry_allow}`);

        if(this.positionType == null || this.entry_allow == false){
            return
        }

        const orderSize = this.capital / current_close;
        this.orderSize = Math.round(orderSize * this.qtyMultiplier) / this.qtyMultiplier;

        this.exit_size_1 = Math.round((orderSize / 2) * this.qtyMultiplier) / this.qtyMultiplier;
        this.exit_size_2 = Math.round((this.orderSize - this.exit_size_1) * this.qtyMultiplier) / this.qtyMultiplier;

        const side = this.positionType == 'long' ? 'Buy' : 'Sell'


        this.openPrice = current_close

        ws_client.sendWSAPIRequest(WS_KEY_MAP.v5PrivateTrade, 'order.create', {
            category: 'linear',
            symbol: this.symbol,
            orderType: 'Market',
            qty: (this.orderSize).toString(),
            side: side,
            category: 'linear',
            orderLinkId : this.orderId_open,
        }).catch((e) => fileLogger.error('oepn : ', e));

        consoleLogger.order(`${this.symbol} open 주문 요청 !!`);
        
    }
    
    async openOrderFilledCallback(){//오픈 포지션 체결되면 스탑설정 1번실행

        const data_60m = await getKline(this.symbol, '60', 12)
        let ema_5 = calculateEMA(data_60m, 5, 1);
        let ema_10 = calculateEMA(data_60m, 10, 1);

        ema_5 = Math.round(ema_5 * this.priceMultiplier) / this.priceMultiplier;
        ema_10 = Math.round(ema_10 * this.priceMultiplier) / this.priceMultiplier;

        if(this.positionType == "long" && ema_5 > ema_10){
            this.exit_price_1 = ema_5
            this.exit_price_2 = ema_10
        }
        else if(this.positionType == "long" && ema_5 < ema_10){
            this.exit_price_1 = ema_10
            this.exit_price_2 = ema_5
        }

        if(this.positionType == "short" && ema_5 < ema_10){
            this.exit_price_1 = ema_5
            this.exit_price_2 = ema_10
        }
        else if(this.positionType == "short" && ema_5 > ema_10){
            this.exit_price_1 = ema_10
            this.exit_price_2 = ema_5
        }
        
        const side = this.positionType == 'long' ? 'Sell' : 'Buy'

        
        ws_client.sendWSAPIRequest(WS_KEY_MAP.v5PrivateTrade, 'order.create', {
            category: "linear",
            symbol: this.symbol,
            side: side,
            qty: (this.exit_size_1).toString(),
            triggerPrice: (this.exit_price_1).toString(),
            triggerBy: "MarkPrice",
            orderType: "Market",
            reduceOnly: true,
            orderLinkId : this.orderId_exit_1,
            timeInForce: "GoodTillCancel"
        }).catch((e) => fileLogger.error('exit1 : ', e));

        ws_client.sendWSAPIRequest(WS_KEY_MAP.v5PrivateTrade, 'order.create', {
            category: "linear",
            symbol: this.symbol,
            side: side,
            qty: (this.exit_size_2).toString(),
            triggerPrice: (this.exit_price_2).toString(),
            triggerBy: "MarkPrice",
            orderType: "Market",
            reduceOnly: true,
            orderLinkId : this.orderId_exit_2,
            timeInForce: "GoodTillCancel"
        }).catch((e) => fileLogger.error('exit2 : ', e));


    }

    async updateStop(){//포지션이있는경우 반복되어야함

        const data_60m = await getKline(this.symbol, '60', 12);
        let ema_5 = calculateEMA(data_60m, 5, 1);
        let ema_10 = calculateEMA(data_60m, 10, 1);

        ema_5 = Math.round(ema_5 * this.priceMultiplier) / this.priceMultiplier;
        ema_10 = Math.round(ema_10 * this.priceMultiplier) / this.priceMultiplier;

        if(this.positionType == "long" && ema_5 > ema_10){
            this.exit_price_1 = ema_5
            this.exit_price_2 = ema_10
        }
        else if(this.positionType == "long" && ema_5 < ema_10){
            this.exit_price_1 = ema_10
            this.exit_price_2 = ema_5
        }

        if(this.positionType == "short" && ema_5 < ema_10){
            this.exit_price_1 = ema_5
            this.exit_price_2 = ema_10
        }
        else if(this.positionType == "short" && ema_5 > ema_10){
            this.exit_price_1 = ema_10
            this.exit_price_2 = ema_5
        }
        
        if(this.isPartialExit == false){//부분익절안되어있는경우면 1차 스탑도 업데이트
            
            ws_client.sendWSAPIRequest(WS_KEY_MAP.v5PrivateTrade, 'order.amend', {
                category: "linear",
                symbol: this.symbol,
                triggerPrice: (this.exit_price_1).toString(),
                orderLinkId : this.orderId_exit_1,
            }).catch((e) => fileLogger.error('exit1 : ', e));
            
            
        }


        ws_client.sendWSAPIRequest(WS_KEY_MAP.v5PrivateTrade, 'order.amend', {
            category: "linear",
            symbol: this.symbol,
            triggerPrice: (this.exit_price_2).toString(),
            orderLinkId : this.orderId_exit_2,
        }).catch((e) => fileLogger.error('exit2 : ', e));


    }

    reset(){

        this.orderSize = 0.0
        this.exit_size_1 = 0.0
        this.exit_size_2 = 0.0

        this.openPrice = 0.0

        this.positionType = null

        this.entry_allow = false
        this.isPartialExit = false
        this.isOpenOrderFilled = false

        // this.orderId_open = null
        // this.orderId_exit_1 = null
        // this.orderId_exit_2 = null

    }



    async orderEventHandle(dataObj){//orderstatus == filled
        
        const data = {...dataObj, 
            openPrice : this.openPrice, 
            exit_price_1 : this.exit_price_1, 
            exit_price_2 : this.exit_price_2
        }
        
        addTradeLog(data)

        if(dataObj?.orderStatus != 'Filled') return;

        consoleLogger.order(`${this.symbol} ${dataObj.orderLinkId} 체결 -- side : ${dataObj.side}, price : ${dataObj.price}, qty : ${dataObj.qty} `);

        if(this.orderId_open == dataObj.orderLinkId){

            this.isOpenOrderFilled = true
            await this.openOrderFilledCallback()
        }
        if(this.orderId_exit_1 == dataObj.orderLinkId){
            this.isPartialExit = true

        }

        const docId = this.getTradeStatusDocId()
        const alog2State = { ...this };
        setTradeStatus(docId, alog2State)


        if(this.orderId_exit_2 == orderLinkId){
            reset()
        }

        
    }

    getTradeStatusDocId(){
        const docId = 'algo2_'+this.symbol+'_trade_status'
        return docId
    }

    async doubleCheckStatus(){
        const res1 = await rest_client.getActiveOrders({
            category: 'linear',
            symbol: this.symbol,
            openOnly: 0,
            orderLinkId : this.orderId_exit_1,
            limit: 1,
        })
        .catch((error) => {
            console.error(error);
        });

        const res2 = await rest_client.getActiveOrders({
            category: 'linear',
            symbol: this.symbol,
            openOnly: 0,
            orderLinkId : this.orderId_exit_2,
            limit: 1,
        })
        .catch((error) => {
            console.error(error);
        });

        if(res1?.result?.list?.length > 0 && res2?.result?.list?.length > 0){
            this.isOpenOrderFilled = true
            this.isPartialExit = false
        }else if(res1?.result?.list?.length <= 0 && res2?.result?.list?.length > 0){
            this.isOpenOrderFilled = true
            this.isPartialExit = true
        }


    }

    async scheduleFunc(){

        if(!this.isOpenOrderFilled){
            this.open()
        }else{
            this.updateStop()
        }

    }




}

module.exports = alogo2