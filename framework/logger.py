#!/usr/bin/env python3

import json
import logging
import os
import sys

LOGGERS = {}
_LOG_FORMAT = "%(asctime)s %(name)-8s %(levelname)-7s %(message)s"
_DATE_FORMAT = '%b %02d %H:%M:%S'
_DEFAULT_LEVEL = logging.INFO
_CONF_DIR="conf"
_CONF_FILE_NAME="system.json"

# Set log level
try:
    system_conf_json = json.load(open(os.path.join(_CONF_DIR, _CONF_FILE_NAME)))
    log_level_str = system_conf_json['log_level']
    log_level = logging.getLevelName(log_level_str)
except:
    # TODO: Print out warning that log level is incorrect or missing
    log_level = _DEFAULT_LEVEL

logging.basicConfig(format=_LOG_FORMAT, datefmt=_DATE_FORMAT, level=log_level)

def get_logger(name):
    if name not in LOGGERS:
        LOGGERS[name] = logging.getLogger(name)
    return LOGGERS[name]