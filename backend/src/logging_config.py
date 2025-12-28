import logging.config
import logging.handlers
import os
import sys

class AnsiColors:
    PINK = '\x1b[35;20m'   # DEBUG
    GRAY = '\x1b[38;20m'  # INFO
    YELLOW = '\x1b[33;20m' # WARNING
    RED = '\x1b[31;20m'    # ERROR
    BOLD_RED = '\x1b[31;1m' # CRITICAL
    RESET = '\x1b[0m'

class ColoredFormatter(logging.Formatter):
    LOG_LEVEL_COLORS = {
        logging.DEBUG: AnsiColors.PINK,
        logging.INFO: AnsiColors.GRAY,
        logging.WARNING: AnsiColors.YELLOW,
        logging.ERROR: AnsiColors.RED,
        logging.CRITICAL: AnsiColors.BOLD_RED,
    }
    DEFAULT_FORMAT = "%(asctime)s [%(levelname)s] %(name)s (%(module)s:%(lineno)d) - %(message)s"
    DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

    def format(self, record):
        color = self.LOG_LEVEL_COLORS.get(record.levelno, AnsiColors.RESET)
        formatter = logging.Formatter(self.DEFAULT_FORMAT, self.DATE_FORMAT)
        log_message = formatter.format(record)
        return f"{color}{log_message}{AnsiColors.RESET}"

BASE_DIR = os.path.dirname(os.path.abspath(__file__)) 
LOG_FILE_PATH = os.path.join(BASE_DIR, "logs", "centralLogs.log")
LOG_DIRECTORY = os.path.dirname(LOG_FILE_PATH) 

def setup_logging():
    if LOG_DIRECTORY and not os.path.exists(LOG_DIRECTORY):
        os.makedirs(LOG_DIRECTORY, exist_ok=True)

    LOGGING_CONFIG = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "plain_text": {
                "format": "%(asctime)s [%(levelname)s] %(name)s (%(module)s:%(funcName)s:%(lineno)d) - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "colored_console": {
                "()": ColoredFormatter,
            },
            "access": {
                "()": "uvicorn.logging.AccessFormatter",
                "fmt": '%(levelprefix)s %(client_addr)s - "%(request_line)s" %(status_code)s',
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "colored_console", 
                "level": "DEBUG", 
            },
            "file": {
                "class": "logging.handlers.TimedRotatingFileHandler",
                "formatter": "plain_text", 
                "filename": LOG_FILE_PATH,
                "when": "midnight",
                "backupCount": 5,
                "encoding": "utf8",
            },
            "access_console": {
                "class": "logging.StreamHandler",
                "formatter": "access",
                "level": "INFO",
            },
        },
        "loggers": {
            "": {
                "handlers": ["console", "file"], 
                "level": "INFO", 
            },
            "uvicorn.error": {
                "handlers": ["console", "file"],
                "level": "DEBUG", 
                "propagate": False,
            },
            "uvicorn.access": {
                "handlers": ["access_console"], 
                "level": "WARNING", 
                "propagate": False,
            },
            # Specifically ensuring your endpoints folder is covered
            "endpoints": {
                "handlers": ["console", "file"],
                "level": "DEBUG",
                "propagate": False,
            },
            "client_logger": { 
                "handlers": ["console", "file"],
                "level": "DEBUG", 
                "propagate": False,
            },
        },
    }

    logging.config.dictConfig(LOGGING_CONFIG)