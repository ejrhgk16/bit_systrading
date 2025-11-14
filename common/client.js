require('dotenv').config();
const { RestClientV5, WebsocketClient, WebsocketAPIClient, WS_KEY_MAP } = require('bybit-api');
const {fileLogger} = require('./logger')

const rest_client = new RestClientV5({
    key: process.env.BYBIT_API_KEY,
    secret: process.env.BYBIT_API_SECRET,
    logger : fileLogger
});

const ws_client = new WebsocketClient({
    key: process.env.BYBIT_API_KEY,
    secret: process.env.BYBIT_API_SECRET,
    logger: fileLogger
  });

const ws_api_client = new WebsocketAPIClient({
    key: process.env.BYBIT_API_KEY,
    secret: process.env.BYBIT_API_SECRET,
    logger : fileLogger
});

module.exports = {rest_client, ws_client, ws_api_client, WS_KEY_MAP};