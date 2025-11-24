import logging.config
import logging.handlers
import os # Import os module

# --- 1. Custom Colored Formatter ---
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


# Finds the directory of the current file
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) 
# Constructs the absolute path to the log file
LOG_FILE_PATH = os.path.join(BASE_DIR, "logs", "centralLogs.log")
LOG_DIRECTORY = os.path.dirname(LOG_FILE_PATH) 


def setup_logging():
    """Configures logging for the application, Uvicorn, and WatchFiles in PLAIN TEXT format."""

    if LOG_DIRECTORY and not os.path.exists(LOG_DIRECTORY):
        try:
            os.makedirs(LOG_DIRECTORY, exist_ok=True)
            # Log this creation event if possible (though it happens before full setup)
            print(f"INFO: Created log directory at: {LOG_DIRECTORY}")
        except Exception as e:
            # If directory creation fails, the file handler will still raise an error,
            # but logging the failure here helps diagnosis.
            print(f"Warning: Failed to create log directory {LOG_DIRECTORY}. File logging may fail. Error: {e}")


    LOGGING_CONFIG = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            # 1. Plain Text Formatter (for the File Handler - NO color)
            "plain_text": {
                "format": "%(asctime)s [%(levelname)s] %(name)s (%(module)s:%(funcName)s:%(lineno)d) - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            # 2. Colored Formatter reference (for the Console Handler)
            "colored_console": {
                "()": "logging_config.ColoredFormatter", # Placeholder, will be replaced below
            },
            # 3. Uvicorn's standard access log formatter 
            "access": {
                "()": "uvicorn.logging.AccessFormatter",
                "fmt": '%(levelprefix)s %(client_addr)s - "%(request_line)s" %(status_code)s',
            },
        },
        "handlers": {
            # Console Handler: Uses the new ColoredFormatter for terminal output
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "colored_console", 
                "level": "DEBUG", 
            },
            # File Handler: Outputs logs to a rotating file (must remain plain text)
            "file": {
                "class": "logging.handlers.TimedRotatingFileHandler",
                "formatter": "plain_text", 
                "filename": LOG_FILE_PATH, # Now uses the absolute path
                "when": "midnight",
                "backupCount": 5,
                "encoding": "utf8",
            },
            # Access Log Console Handler: Uses Uvicorn's access format
            "access_console": {
                "class": "logging.StreamHandler",
                "formatter": "access",
                "level": "INFO",
            },
        },
        "loggers": {
            # Root Logger: HANDLERS REMOVED to prevent duplication of named loggers
            "": {
                "handlers": [], 
                "level": "DEBUG", 
                "propagate": False,
            },
            # Uvicorn Error Logger: Logs server errors
            "uvicorn.error": {
                "handlers": ["console", "file"],
                "level": "DEBUG", 
                "propagate": False,
            },
            # Uvicorn Access Logger: Suppress INFO access logs to keep console clean
            "uvicorn.access": {
                "handlers": ["access_console"], 
                "level": "WARNING", 
                "propagate": False,
            },
            # WATCHFILES Logger: Silenced 
            "watchfiles.main": {
                "handlers": ["console", "file"],
                "level": "ERROR", 
                "propagate": False,
            },
            # Application Logger definitions 
            "app": {
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

    LOGGING_CONFIG['formatters']['colored_console']['()'] = ColoredFormatter

    logging.config.dictConfig(LOGGING_CONFIG)