import logging.config
import logging.handlers

LOG_FILE_PATH = "src/logs/centralLogs.log"

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
            # Root Logger: Catches all unhandled logs (e.g., your custom modules)
            "": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            # Uvicorn Error Logger: Still logs critical server errors (e.g., 500s)
            "uvicorn.error": {
                "handlers": ["console", "file"],
                "level": "WARNING", # Already set to WARNING, good for production errors
                "propagate": False,
            },
            # Uvicorn Access Logger: RAISE LEVEL to suppress INFO (200 OK) logs
            "uvicorn.access": {
                "handlers": ["console", "file"],
                "level": "WARNING", # <--- CHANGED FROM "INFO" to suppress 200/OPTIONS logs
                "propagate": False,
            },
            # WATCHFILES Logger: EXPLICITLY ADDED to suppress "1 change detected" logs
            "watchfiles.main": {
                "handlers": ["console", "file"],
                "level": "ERROR", # <--- ADDED to ignore repetitive INFO/DEBUG checks
                "propagate": False,
            },
            # Your Application Logger 
            "app": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
        },
    }

    logging.config.dictConfig(LOGGING_CONFIG)