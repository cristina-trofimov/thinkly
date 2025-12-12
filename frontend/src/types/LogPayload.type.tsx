export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LogPayload {
    level: LogLevel;
    message: string;
    component: string;
    url: string;
    stack?: string;
}