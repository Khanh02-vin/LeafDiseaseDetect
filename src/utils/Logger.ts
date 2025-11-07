export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SUCCESS = 4,
}

export enum LogCategory {
  APP = 'APP',
  INIT = 'INIT',
  ML = 'ML',
  IMAGE = 'IMAGE',
  CLASSIFICATION = 'CLASSIFICATION',
  STORAGE = 'STORAGE',
  NETWORK = 'NETWORK',
}

interface LogConfig {
  level: LogLevel;
  enabled: boolean;
  timestamps: boolean;
  colors: boolean;
}

class LoggerService {
  private config: LogConfig = {
    level: LogLevel.DEBUG,
    enabled: true,
    timestamps: true,
    colors: true,
  };

  constructor() {
    if (typeof __DEV__ !== 'undefined' && !__DEV__) {
      this.config.level = LogLevel.INFO;
    }
  }

  public configure(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  public debug(category: LogCategory | string, message: string, context?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.log(LogLevel.DEBUG, category, message, context);
    }
  }

  public info(category: LogCategory | string, message: string, context?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.log(LogLevel.INFO, category, message, context);
    }
  }

  public warn(category: LogCategory | string, message: string, context?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.log(LogLevel.WARN, category, message, context);
    }
  }

  public error(category: LogCategory | string, message: string, error?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.log(LogLevel.ERROR, category, message, error);
      if (error instanceof Error && error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }

  public success(category: LogCategory | string, message: string, context?: any): void {
    if (this.shouldLog(LogLevel.SUCCESS)) {
      this.log(LogLevel.SUCCESS, category, message, context);
    }
  }

  public time(label: string): void {
    if (this.config.enabled && typeof console.time === 'function') {
      console.time(label);
    }
  }

  public timeEnd(label: string): void {
    if (this.config.enabled && typeof console.timeEnd === 'function') {
      console.timeEnd(label);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.config.enabled && level >= this.config.level;
  }

  private log(level: LogLevel, category: string, message: string, context?: any): void {
    const timestamp = this.config.timestamps ? this.getTimestamp() : '';
    const levelLabel = this.getLevelLabel(level);
    const categoryLabel = `[${category}]`;
    
    const logMessage = `${timestamp} ${categoryLabel} ${levelLabel}: ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.log(logMessage);
        break;
      case LogLevel.INFO:
        console.log(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
      case LogLevel.SUCCESS:
        console.log(logMessage);
        break;
    }

    if (context !== undefined) {
      console.log('Context:', context);
    }
  }

  private getTimestamp(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];
    return `[${date} ${time}]`;
  }

  private getLevelLabel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'DEBUG';
      case LogLevel.INFO:
        return 'INFO';
      case LogLevel.WARN:
        return 'WARN';
      case LogLevel.ERROR:
        return 'ERROR';
      case LogLevel.SUCCESS:
        return 'SUCCESS';
      default:
        return 'LOG';
    }
  }
}

export const Logger = new LoggerService();
