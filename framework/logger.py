"""Manages stream and file loggers."""
import json
import logging
import os

LOGGERS = {}
_LOG_FORMAT = '%(asctime)s %(name)-8s %(levelname)-7s %(message)s'
_DATE_FORMAT = '%b %02d %H:%M:%S'
_DEFAULT_LOG_LEVEL = logging.INFO
_LOG_LEVEL = logging.INFO
_CONF_DIR = 'conf'
_CONF_FILE_NAME = 'system.json'
_LOG_DIR = 'runtime/testing/'

# Set log level
with open(os.path.join(_CONF_DIR, _CONF_FILE_NAME),
          encoding='utf-8') as system_conf_file:
  system_conf_json = json.load(system_conf_file)
log_level_str = system_conf_json['log_level']

temp_log = logging.getLogger('temp')
try:
  temp_log.setLevel(logging.getLevelName(log_level_str))
  _LOG_LEVEL = logging.getLevelName(log_level_str)
except ValueError:
  print('Invalid log level set in ' + _CONF_DIR + '/' + _CONF_FILE_NAME +
        '. Using INFO as log level')
  _LOG_LEVEL = _DEFAULT_LOG_LEVEL

log_format = logging.Formatter(fmt=_LOG_FORMAT, datefmt=_DATE_FORMAT)

def add_file_handler(log, log_file):
  handler = logging.FileHandler(_LOG_DIR + log_file + '.log')
  handler.setFormatter(log_format)
  log.addHandler(handler)

def add_stream_handler(log):
  handler = logging.StreamHandler()
  handler.setFormatter(log_format)
  log.addHandler(handler)

def get_logger(name, log_file=None):
  if name not in LOGGERS:
    LOGGERS[name] = logging.getLogger(name)
    LOGGERS[name].setLevel(_LOG_LEVEL)
    add_stream_handler(LOGGERS[name])
  if log_file is not None:
    add_file_handler(LOGGERS[name], log_file)
  return LOGGERS[name]
