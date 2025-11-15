const winston = require('winston');
const path = require('path');

// 현재 날짜를 'YYYY-MM-DD' 형식으로 UTC 기준으로 반환하는 헬퍼 함수
const getTodayDate = () => {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// UTC 타임스탬프 포맷 함수
const utcTimestamp = () => {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}Z`; // 'Z'는 UTC를 의미
};

// 로그 파일 경로를 절대 경로로 생성
const logFilePath = path.join(__dirname, '..', 'logs', `app-${getTodayDate()}.log`);

// 파일 저장을 위한 Winston 로거 선언
const fileLogger = winston.createLogger({
  level: 'info', // 파일에 저장할 로그 레벨 설정
  format: winston.format.combine(
    winston.format.timestamp({
      format: utcTimestamp // UTC 타임스탬프 사용
    }),
    winston.format.printf(info => `[${info.timestamp} ${info.level}] ${info.message}`)
  ),
  transports: [
    new winston.transports.File({ filename: `../logs/app-${getTodayDate()}.log` }) // logs/ 폴더 안에 현재 날짜를 포함한 파일명 사용
  ]
});

 const customLevels = {
  levels: {
    error: 0,
    warn:  1,
    info:  2,
    order: 3, // 'trade' 레벨 추가 (info와 warn 사이의 중요도)
    debug: 4,
  },
   colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    order: 'magenta', // 'trade' 레벨에 마젠타 색상 지정
    debug: 'blue',
   }
 }

// 콘솔 출력을 위한 Winston 로거 선언
const consoleLogger = winston.createLogger({
  level: customLevels.levels, // 콘솔에 출력할 로그 레벨 설정
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

module.exports = { fileLogger, consoleLogger };