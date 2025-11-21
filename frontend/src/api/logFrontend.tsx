interface LogPayload {
    level: 'ERROR' | 'WARN' | 'INFO';
    message: string;
    component: string;
    url: string;
    stack?: string;
}

const BACKEND_LOG_URL = 'http://localhost:8000/api/v1/client-log'; // Use your actual endpoint path

export const logFrontend = async (payload: LogPayload) => {
    try {
        // Optional: Add the Trace ID from your request headers here later
        await fetch(BACKEND_LOG_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    } catch (e) {
        console.error('Failed to send log to server:', e);
    }
};