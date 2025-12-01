const { ws_client, WS_KEY_MAP } = require("../common/client");

const exit1Params = {
    category: "linear",
    symbol: 'ETHUSDT',
    side: 'Buy',
    qty: '0.08',
    triggerPrice: '2975.98',
    triggerDirection: '1',
    triggerBy: "MarkPrice",
    orderType: "Market",
    reduceOnly: true,
    orderLinkId : 'alog2_ETHUSDT_bb1_exit1_1764559239929',
    timeInForce: "GoodTillCancel"
};

ws_client.sendWSAPIRequest(WS_KEY_MAP.v5PrivateTrade, 'order.create', exit1Params)

const exit1Params2 = {
    category: "linear",
    symbol: 'ETHUSDT',
    side: 'Buy',
    qty: '0.08',
    triggerPrice: '2992.08',
    triggerDirection: '1',
    triggerBy: "MarkPrice",
    orderType: "Market",
    reduceOnly: true,
    orderLinkId : 'alog2_ETHUSDT_bb1_exit2_1764559239929',
    timeInForce: "GoodTillCancel"
};

ws_client.sendWSAPIRequest(WS_KEY_MAP.v5PrivateTrade, 'order.create', exit1Params2)