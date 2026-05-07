export const logBuffer: string[] = [];

export const serverLogger = {
  info: (ctx: string, msg: string, data?: any) => {
    const line = `[${new Date().toLocaleTimeString()}] [INFO] [${ctx.toUpperCase()}] ${msg}${data ? ' ' + JSON.stringify(data) : ""}`;
    console.log(line);
    logBuffer.push(line);
    if (logBuffer.length > 200) logBuffer.shift();
  },
  warn: (ctx: string, msg: string, data?: any) => {
    const line = `[${new Date().toLocaleTimeString()}] [WARN] [${ctx.toUpperCase()}] ${msg}${data ? ' ' + JSON.stringify(data) : ""}`;
    console.warn(line);
    logBuffer.push(line);
    if (logBuffer.length > 200) logBuffer.shift();
  },
  error: (ctx: string, msg: string, data?: any) => {
    const line = `[${new Date().toLocaleTimeString()}] [ERROR] [${ctx.toUpperCase()}] ${msg}${data ? ' ' + JSON.stringify(data) : ""}`;
    console.error(line);
    logBuffer.push(line);
    if (logBuffer.length > 200) logBuffer.shift();
  }
};
