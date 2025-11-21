import logging.config
import logging.handlers

LOG_FILE_PATH = "src/logs/backendLogs.log"

def setup_logging():
    """Configures logging for the application, Uvicorn, and WatchFiles in JSON format."""

    # This configuration dictionary overrides Uvicorn's default loggers.
    LOGGING_CONFIG = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            # Define the JSON Formatter
            "json": {
                "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                # The format string defines the fields to include in the JSON log.
                # Important: Uvicorn ignores the format string for its internal loggers,
                # but it's crucial for your custom and external loggers like WatchFiles.
                "format": "%(levelname)s %(asctime)s %(name)s %(module)s %(funcName)s %(lineno)d %(message)s",
                "json_ensure_ascii": False,
            },
            # Uvicorn's standard access log formatter (optional, but good practice)
            "access": {
                "()": "uvicorn.logging.AccessFormatter",
                "fmt": '%(levelprefix)s %(client_addr)s - "%(request_line)s" %(status_code)s',
            },
        },
        "handlers": {
            # Console Handler: Outputs structured JSON logs to stdout
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "json",
                "level": "INFO",
            },
            # File Handler: Outputs structured JSON logs to the rotating file
            "file": {
                "class": "logging.handlers.TimedRotatingFileHandler",
                "formatter": "json",
                "filename": LOG_FILE_PATH,
                "when": "midnight",
                "backupCount": 5,
                "encoding": "utf8",
            },
            # Uvicorn's standard access log handler (useful if you want access logs separated)
            "access_console": {
                "class": "logging.StreamHandler",
                "formatter": "access",
                "level": "INFO",
            },
        },
        "loggers": {
            # Root Logger: Catches all logs not handled elsewhere (including WatchFiles)
            "": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            # Uvicorn Error Logger: Logs server exceptions/errors in JSON
            "uvicorn.error": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            # Uvicorn Access Logger: Logs incoming HTTP requests in JSON
            # Note: For access logs, you might want to use the default Uvicorn format for clarity, 
            # or explicitly send them to the JSON handler as shown below.
            "uvicorn.access": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            # Your Application Logger (if you use a named logger like logging.getLogger("app"))
            "app": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
        },
    }

    logging.config.dictConfig(LOGGING_CONFIG)