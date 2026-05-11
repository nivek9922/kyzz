type LogContext = Record<string, unknown>;

const fmt = (level: string, ctx: LogContext, msg: string) =>
  JSON.stringify({ level, ...ctx, msg, ts: new Date().toISOString() });

export const logger = {
  info:  (ctx: LogContext, msg: string) => console.log(fmt('info',   ctx, msg)),
  warn:  (ctx: LogContext, msg: string) => console.warn(fmt('warn',  ctx, msg)),
  error: (ctx: LogContext, msg: string) => console.error(fmt('error', ctx, msg)),
};
