const winston = require('winston');
const path = require('path');

// 현재 날짜를 'YYYY-MM-DD' 형식으로 반환하는 함수
function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

// UTC 타임스탬프를 반환하는 함수
const utcTimestamp = () => {
  return new Date().toUTCString();
};


// 사용자 지정 로그 레벨 및 색상 정의
const customLevels = {
  levels: {
    error: 0,
    warn:  1,
    info:  2,
    order: 3, // 'order' 레벨 추가
    debug: 4,
  },
   colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    order: 'cyan', // 'aqua'에서 'cyan'으로 수정
    debug: 'blue',
   }
};

// Winston에 사용자 지정 레벨 및 색상 적용
winston.addColors(customLevels.colors);

// 파일 저장을 위한 Winston 로거 선언
const fileLogger = winston.createLogger({
  level: 'info', // 파일에 저장할 최소 로그 레벨 설정
  format: winston.format.combine(
    winston.format.timestamp({
      format: utcTimestamp // UTC 타임스탬프 사용
    }),
    winston.format.printf(info => `[${info.timestamp} ${info.level}] ${info.message}`)
  ),
  transports: [
    new winston.transports.File({ filename: `logs/${getTodayDate()}.log`})
  ]
});

// 콘솔 출력을 위한 Winston 로거 선언
const consoleLogger = winston.createLogger({
  levels: customLevels.levels,
  level: 'debug', // 수정된 부분: 모든 레벨의 로그가 콘솔에 출력되도록 'debug'로 설정
  format: winston.format.combine(
    winston.format.colorize(), // 콘솔 출력에 색상 적용
    winston.format.timestamp({
      format: utcTimestamp // UTC 타임스탬프 사용
    }),
    winston.format.printf(info => `[${info.timestamp} ${info.level}] ${info.message}`)
  ),
  transports: [
    new winston.transports.Console() // 콘솔에 출력
  ]
});

// 커스텀 레벨 메서드를 consoleLogger에 직접 추가
// 예: consoleLogger.order('주문 관련 로그');
Object.keys(customLevels.levels).forEach(level => {
  consoleLogger[level] = (message, ...meta) => {
    consoleLogger.log(level, message, ...meta);
  };
});


module.exports = { fileLogger, consoleLogger };
