import logging.config
import logging.handlers

LOG_FILE_PATH = "src/logs/centralLogs.log"

def setup_logging():
    """Configures logging for the application, Uvicorn, and WatchFiles in PLAIN TEXT format."""

    # This configuration dictionary overrides Uvicorn's default loggers.
    LOGGING_CONFIG = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "plain_text": {
                # Format includes basic info: Timestamp [Level] Logger.Name (Module:Line) - Message
                "format": "%(asctime)s [%(levelname)s] %(name)s (%(module)s:%(lineno)d) - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            # Uvicorn's standard access log formatter (retained for clean access logs)
            "access": {
                "()": "uvicorn.logging.AccessFormatter",
                "fmt": '%(levelprefix)s %(client_addr)s - "%(request_line)s" %(status_code)s',
            },
        },
        "handlers": {
            # Console Handler: Outputs plain text logs to stdout
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "plain_text",
                "level": "INFO",
            },
            # File Handler: Outputs plain text logs to the rotating file
            "file": {
                "class": "logging.handlers.TimedRotatingFileHandler",
                "formatter": "plain_text", # Now uses plain_text
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
            # Root Logger: Catches all unhandled logs (including WatchFiles)
            "": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            # Uvicorn Error Logger: Still logs server errors in plain text
            "uvicorn.error": {
                "handlers": ["console", "file"],
                "level": "WARNING",
                "propagate": False,
            },
            # Uvicorn Access Logger: Uses the clean 'access' formatter and is silenced below INFO
            "uvicorn.access": {
                "handlers": ["access_console", "file"],
                "level": "WARNING", 
                "propagate": False,
            },
            # WATCHFILES Logger: Silenced
            "watchfiles.main": {
                "handlers": ["console", "file"],
                "level": "ERROR", 
                "propagate": False,
            },
            # Application and Client Logger definitions
            "app": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            "client_logger": { # Logger used by the frontend ingestion endpoint
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
        },
    }

    logging.config.dictConfig(LOGGING_CONFIG)