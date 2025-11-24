import logging.config
import logging.handlers

class AnsiColors:
    """Helper class for ANSI escape codes."""
    GRAY = '\x1b[38;20m'   # DEBUG
    GREEN = '\x1b[32;20m'  # INFO
    YELLOW = '\x1b[33;20m' # WARNING
    RED = '\x1b[31;20m'    # ERROR
    BOLD_RED = '\x1b[31;1m' # CRITICAL 
    RESET = '\x1b[0m'      # Reset color

class ColoredFormatter(logging.Formatter):
    """Custom formatter to add color based on log level."""
    
    LOG_LEVEL_COLORS = {
        logging.DEBUG: AnsiColors.GRAY,
        logging.INFO: AnsiColors.GREEN,
        logging.WARNING: AnsiColors.YELLOW,
        logging.ERROR: AnsiColors.RED,
        logging.CRITICAL: AnsiColors.BOLD_RED,
    }

    # Format structure must match the 'plain_text' formatter format
    DEFAULT_FORMAT = "%(asctime)s [%(levelname)s] %(name)s (%(module)s:%(lineno)d) - %(message)s"
    DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

    def format(self, record):
        # Get the color based on the log level
        color = self.LOG_LEVEL_COLORS.get(record.levelno, AnsiColors.RESET)
        
        # Instantiate the base formatter using the desired format/datefmt
        formatter = logging.Formatter(self.DEFAULT_FORMAT, self.DATE_FORMAT)
        log_message = formatter.format(record)
        
        # Inject the color codes: [COLOR] message [RESET]
        return f"{color}{log_message}{AnsiColors.RESET}"

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
            "colored_console": {
                "()": "logging_config.ColoredFormatter",
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
                "formatter": "colored_console",
                "level": "DEBUG",
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
                "level": "DEBUG",
                "propagate": False,
            },
            # Uvicorn Error Logger: Still logs server errors in plain text
            "uvicorn.error": {
                "handlers": ["console", "file"],
                "level": "DEBUG",
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
                "level": "DEBUG",
                "propagate": False,
            },
            "client_logger": { # Logger used by the frontend ingestion endpoint
                "handlers": ["console", "file"],
                "level": "DEBUG",
                "propagate": False,
            },
        },
    }

    LOGGING_CONFIG['formatters']['colored_console']['()'] = ColoredFormatter

    logging.config.dictConfig(LOGGING_CONFIG)