#!/usr/bin/env python3

import json
import logging
import os

LOGGERS = {}
_LOG_FORMAT = "%(asctime)s %(name)-8s %(levelname)-7s %(message)s"
_DATE_FORMAT = '%b %02d %H:%M:%S'
_DEFAULT_LEVEL = logging.INFO
_CONF_DIR = "conf"
_CONF_FILE_NAME = "system.json"
_LOG_DIR = "/runtime/network/"

# Set log level
try:
    system_conf_json = json.load(
        open(os.path.join(_CONF_DIR, _CONF_FILE_NAME), encoding='utf-8'))
    log_level_str = system_conf_json['log_level']
    log_level = logging.getLevelName(log_level_str)
except:
    # TODO: Print out warning that log level is incorrect or missing
    log_level = _DEFAULT_LEVEL

log_format = logging.Formatter(fmt=_LOG_FORMAT, datefmt=_DATE_FORMAT)


def add_file_handler(log, log_file):
    handler = logging.FileHandler(_LOG_DIR+log_file+".log")
    handler.setFormatter(log_format)
    log.addHandler(handler)

def add_stream_handler(log):
    handler = logging.StreamHandler()
    handler.setFormatter(log_format)
    log.addHandler(handler)

def get_logger(name, log_file=None):
    if name not in LOGGERS:
        LOGGERS[name] = logging.getLogger(name)
        LOGGERS[name].setLevel(log_level)
        add_stream_handler(LOGGERS[name])
    if log_file is not None:
        add_file_handler(LOGGERS[name], log_file)
    return LOGGERS[name]
