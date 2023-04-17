"""Manages all things logging."""
import json
import logging
import os

LOGGERS = {}
_LOG_FORMAT = "%(asctime)s %(name)-8s %(levelname)-7s %(message)s"
_DATE_FORMAT = '%b %02d %H:%M:%S'
_CONF_DIR="conf"
_CONF_FILE_NAME="system.json"

with open(os.path.join(_CONF_DIR, _CONF_FILE_NAME), encoding='utf-8') as config_file:
    system_conf_json = json.load(config_file)
    log_level_str = system_conf_json['log_level']
    log_level = logging.getLevelName(log_level_str)

logging.basicConfig(format=_LOG_FORMAT, datefmt=_DATE_FORMAT, level=log_level)

def get_logger(name):
    """Returns the logger belonging to the class calling the method."""
    if name not in LOGGERS:
        LOGGERS[name] = logging.getLogger(name)
    return LOGGERS[name]
