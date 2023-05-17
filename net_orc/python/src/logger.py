"""Sets up the logger to be used for the network orchestrator."""
import json
import logging
import os

LOGGERS = {}
_LOG_FORMAT = '%(asctime)s %(name)-8s %(levelname)-7s %(message)s'
_DATE_FORMAT = '%b %02d %H:%M:%S'
_DEFAULT_LEVEL = logging.INFO
_CONF_DIR = 'conf'
_CONF_FILE_NAME = 'system.json'

# Set log level
try:

  with open(os.path.join(_CONF_DIR, _CONF_FILE_NAME),
            encoding='UTF-8') as config_json_file:
    system_conf_json = json.load(config_json_file)

  log_level_str = system_conf_json['log_level']
  LOG_LEVEL = logging.getLevelName(log_level_str)
except OSError:
  LOG_LEVEL = _DEFAULT_LEVEL

logging.basicConfig(format=_LOG_FORMAT, datefmt=_DATE_FORMAT, level=LOG_LEVEL)


def get_logger(name):
  if name not in LOGGERS:
    LOGGERS[name] = logging.getLogger(name)
  return LOGGERS[name]
