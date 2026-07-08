/**
 * Structured logger.
 *
 * MCP servers speak JSON-RPC on stdout, so ALL logging goes to stderr.
 * A bounded in-memory ring buffer keeps recent entries for the demo dashboard.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly ts: string;
  readonly level: LogLevel;
  readonly msg: string;
  readonly data?: Record<string, unknown>;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const RING_CAPACITY = 500;

export class Logger {
  private readonly entries: LogEntry[] = [];

  constructor(
    private readonly minLevel: LogLevel = 'info',
    private readonly sink: (line: string) => void = (line) => process.stderr.write(line + '\n'),
  ) {}

  debug(msg: string, data?: Record<string, unknown>): void {
    this.log('debug', msg, data);
  }

  info(msg: string, data?: Record<string, unknown>): void {
    this.log('info', msg, data);
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    this.log('warn', msg, data);
  }

  error(msg: string, data?: Record<string, unknown>): void {
    this.log('error', msg, data);
  }

  /** Most recent entries (newest last), for the demo dashboard. */
  recent(limit = 100): readonly LogEntry[] {
    return this.entries.slice(-limit);
  }

  private log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.minLevel]) return;
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...(data !== undefined ? { data } : {}),
    };
    this.entries.push(entry);
    if (this.entries.length > RING_CAPACITY)
      this.entries.splice(0, this.entries.length - RING_CAPACITY);
    this.sink(JSON.stringify(entry));
  }
}
