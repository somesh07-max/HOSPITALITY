import { env } from '../config/env';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private format(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  info(message: string, meta?: any): void {
    console.log(this.format('info', message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.format('warn', message, meta));
  }

  error(message: string, meta?: any): void {
    console.error(this.format('error', message, meta));
  }

  debug(message: string, meta?: any): void {
    if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      console.debug(this.format('debug', message, meta));
    }
  }
}

export const logger = new Logger();

