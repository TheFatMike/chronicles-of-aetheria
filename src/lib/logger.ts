import { useGameStore } from '../store/useGameStore';
import { DEBUG_CONFIG, isDebugEnabled, DebugCategory } from '../debug.config';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private static instance: Logger;
  private logBuffer: string[] = [];
  private readonly MAX_BUFFER = 1000;
  
  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(level: LogLevel, context: string, message: string, data?: any) {
    const { devMode } = useGameStore.getState();
    
    const category = context.toUpperCase() as DebugCategory;
    const isCategoryEnabled = isDebugEnabled('CLIENT', category);
    
    if (level !== 'error' && (!DEBUG_CONFIG.ENABLED || !isCategoryEnabled)) return;
    if (level !== 'error' && !devMode) return;

    const timestamp = new Date().toLocaleTimeString();
    const label = `[${timestamp}] [${context.toUpperCase()}]`;
    const fullMessage = `${label} ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
    
    // Buffer for file output
    this.logBuffer.push(fullMessage);
    if (this.logBuffer.length > this.MAX_BUFFER) this.logBuffer.shift();

    const style = this.getStyle(level);
    if (data) {
      console.log(`%c${label} %c${message}`, style.label, style.message, data);
    } else {
      console.log(`%c${label} %c${message}`, style.label, style.message);
    }
  }

  getBuffer() {
    return this.logBuffer;
  }

  downloadLogs() {
    const blob = new Blob([this.logBuffer.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aetheria_debug_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
