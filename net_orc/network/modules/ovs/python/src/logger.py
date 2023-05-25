#!/usr/bin/env python3

import logging

LOGGERS = {}
_LOG_FORMAT = "%(asctime)s %(name)-8s %(levelname)-7s %(message)s"
_DATE_FORMAT = '%b %02d %H:%M:%S'

# Set level to debug if set as runtime flag
logging.basicConfig(format=_LOG_FORMAT, 
                    datefmt=_DATE_FORMAT, 
                    level=logging.INFO)

def get_logger(name):
  if name not in LOGGERS:
    LOGGERS[name] = logging.getLogger(name)
  return LOGGERS[name]
