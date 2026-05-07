import { useGameStore } from '../store/useGameStore';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private static instance: Logger;
  
  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(level: LogLevel, context: string, message: string, data?: any) {
    const { devMode } = useGameStore.getState();
    if (level !== 'error' && !devMode) return;

    const timestamp = new Date().toLocaleTimeString();
    const style = this.getStyle(level);
    const label = `[${timestamp}] [${context.toUpperCase()}]`;

    if (data) {
      console.log(`%c${label} %c${message}`, style.label, style.message, data);
    } else {
      console.log(`%c${label} %c${message}`, style.label, style.message);
    }
  }

  private getStyle(level: LogLevel) {
    switch (level) {
      case 'error':
        return { label: 'color: #ff4d4d; font-weight: bold;', message: 'color: #ffb3b3;' };
      case 'warn':
        return { label: 'color: #ffa500; font-weight: bold;', message: 'color: #ffd27f;' };
      case 'info':
        return { label: 'color: #00bfff; font-weight: bold;', message: 'color: #87cefa;' };
      default:
        return { label: 'color: #adff2f; font-weight: bold;', message: 'color: #d3ffce;' };
    }
  }

  info(context: string, message: string, data?: any) { this.log('info', context, message, data); }
  warn(context: string, message: string, data?: any) { this.log('warn', context, message, data); }
  error(context: string, message: string, data?: any) { this.log('error', context, message, data); }
  debug(context: string, message: string, data?: any) { this.log('debug', context, message, data); }
}

export const logger = Logger.getInstance();
