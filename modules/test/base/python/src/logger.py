# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Sets up the logger to be used for the test modules."""
import json
import logging
import os

LOGGERS = {}
_LOG_FORMAT = '%(asctime)s %(name)-8s %(levelname)-7s %(message)s'
_DATE_FORMAT = '%b %02d %H:%M:%S'
_DEFAULT_LEVEL = logging.INFO
_CONF_DIR = 'conf'
_CONF_FILE_NAME = 'system.json'
_LOG_DIR = '/runtime/output/'

# Set log level
try:
  with open(os.path.join(_CONF_DIR, _CONF_FILE_NAME),
            encoding='UTF-8') as config_json_file:
    system_conf_json = json.load(config_json_file)

  log_level_str = system_conf_json['log_level']
  log_level = logging.getLevelName(log_level_str)
except OSError:
  # TODO: Print out warning that log level is incorrect or missing
  log_level = _DEFAULT_LEVEL

log_format = logging.Formatter(fmt=_LOG_FORMAT, datefmt=_DATE_FORMAT)


def add_file_handler(log, log_file, log_dir=_LOG_DIR):
  handler = logging.FileHandler(log_dir + log_file + '.log')
  handler.setFormatter(log_format)
  log.addHandler(handler)


def add_stream_handler(log):
  handler = logging.StreamHandler()
  handler.setFormatter(log_format)
  log.addHandler(handler)


def get_logger(name, log_file=None, log_dir=_LOG_DIR):
  if name not in LOGGERS:
    LOGGERS[name] = logging.getLogger(name)
    LOGGERS[name].setLevel(log_level)
    add_stream_handler(LOGGERS[name])
  if log_file is not None:
    log_dir = log_dir if log_dir is not None else _LOG_DIR
    add_file_handler(LOGGERS[name], log_file, log_dir=log_dir)
  return LOGGERS[name]
