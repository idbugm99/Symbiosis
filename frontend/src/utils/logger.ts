// Symbiosis - Logger Module

// Log levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

const LogLevelName = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARN',
  3: 'ERROR',
  4: 'NONE',
};

// Determine log level from environment
const getLogLevel = () => {
  if (import.meta.env.PROD) {
    return LogLevel.ERROR; // Only log errors in production
  }
  return LogLevel.DEBUG; // Log everything in development
};

const currentLogLevel = getLogLevel();

// Logger class
class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: number, message: any, ...args: any[]) {
    if (level >= currentLogLevel) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${LogLevelName[level]}] [${this.context}]`;
      const fullMessage = `${prefix} ${message}`;
      
      console.log(fullMessage, ...args);
    }
  }

  debug(message: any, ...args: any[]) {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: any, ...args: any[]) {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: any, ...args: any[]) {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: any, ...args: any[]) {
    this.log(LogLevel.ERROR, message, ...args);
  }
}

// Factory function to create logger instances
export const createLogger = (context: string) => new Logger(context);
