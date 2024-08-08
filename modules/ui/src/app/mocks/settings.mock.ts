/*
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Adapters, SystemConfig, SystemInterfaces } from '../model/setting';

export const MOCK_SYSTEM_CONFIG_WITH_NO_DATA: SystemConfig = {
  network: {
    device_intf: '',
    internet_intf: '',
  },
  log_level: '',
  monitor_period: undefined,
};

export const MOCK_SYSTEM_CONFIG_WITH_DATA: SystemConfig = {
  network: {
    device_intf: 'mockDeviceKey',
    internet_intf: 'mockInternetKey',
  },
  log_level: 'DEBUG',
  monitor_period: 600,
};

export const MOCK_INTERFACES: SystemInterfaces = {
  mockDeviceKey: 'mockDeviceValue',
  mockInternetKey: 'mockInternetValue',
};

export const MOCK_INTERNET_OPTIONS: SystemInterfaces = {
  '': 'Not specified',
  mockDeviceKey: 'mockDeviceValue',
  mockInternetKey: 'mockInternetValue',
};
export const MOCK_DEVICE_VALUE: SystemInterfaces = {
  key: 'mockDeviceKey',
  value: 'mockDeviceValue',
};
export const MOCK_INTERFACE_VALUE: SystemInterfaces = {
  key: 'mockInternetKey',
  value: 'mockInternetValue',
};
export const MOCK_LOG_VALUE: SystemInterfaces = {
  key: 'DEBUG',
  value: 'Every event will be logged',
};

export const MOCK_PERIOD_VALUE: SystemInterfaces = {
  key: '600',
  value: 'Very slow device',
};

export const MOCK_ADAPTERS: Adapters = {
  adapters_added: { mockNewInternetKey: 'mockNewInternetValue' },
  adapters_removed: { mockInternetKey: 'mockInternetValue' },
};
