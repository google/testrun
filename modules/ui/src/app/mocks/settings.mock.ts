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
import { SystemConfig } from '../model/setting';
import { SystemInterfaces } from '../services/test-run.service';

export const MOCK_SYSTEM_CONFIG_WITH_NO_DATA: SystemConfig = {
  network: {
    device_intf: '',
    internet_intf: '',
  },
};

export const MOCK_SYSTEM_CONFIG_WITH_DATA: SystemConfig = {
  network: {
    device_intf: 'mockDeviceKey',
    internet_intf: 'mockInternetKey',
  },
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
