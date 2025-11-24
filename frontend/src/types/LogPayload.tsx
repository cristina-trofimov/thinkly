export interface LogPayload {
    level: 'ERROR' | 'WARN' | 'INFO';
    message: string;
    component: string;
    url: string;
    stack?: string;
}