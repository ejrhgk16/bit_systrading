require('dotenv').config();
const { RestClientV5, WebsocketClient, WebsocketAPIClient, WS_KEY_MAP } = require('bybit-api');
const {fileLogger} = require('./logger')

const key = process.env.BYBIT_API_KEY
const secret = process.env.BYBIT_API_SECRET
const isDemo = false

const rest_client = new RestClientV5({
    key: key,
    secret: secret,
    demoTrading : isDemo,
    logger : fileLogger
});

const ws_client = new WebsocketClient({
    key: key,
    secret: secret,
    demoTrading : isDemo,
    logger: fileLogger
  });

const ws_api_client = new WebsocketAPIClient({
    key: key,
    secret: secret,
    demoTrading : isDemo,
    logger : fileLogger
});

module.exports = {rest_client, ws_client, ws_api_client, WS_KEY_MAP};