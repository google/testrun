/**
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
import { Device, DeviceStatus } from '../model/device';
import { ProfileRisk } from '../model/profile';
import { FormControlType, QuestionFormat } from '../model/question';

export const device = {
  status: DeviceStatus.VALID,
  manufacturer: 'Delta',
  model: 'O3-DIN-CPU',
  mac_addr: '00:1e:42:35:73:c4',
  test_modules: {
    dns: {
      enabled: true,
    },
  },
} as Device;

export const expired_device = {
  status: DeviceStatus.INVALID,
  manufacturer: 'Delta',
  model: 'O3-DIN-CPU',
  mac_addr: '00:1e:42:35:73:c4',
  test_modules: {
    dns: {
      enabled: true,
    },
  },
} as Device;
export const updated_device = {
  status: DeviceStatus.VALID,
  manufacturer: 'Alpha',
  model: 'O3-XYZ-CPU',
  mac_addr: '00:1e:42:35:73:11',
  test_modules: {
    dns: {
      enabled: true,
    },
  },
} as Device;

export const MOCK_TEST_MODULES = [
  {
    displayName: 'Connection',
    name: 'connection',
    enabled: true,
  },
  {
    displayName: 'Udmi',
    name: 'udmi',
    enabled: true,
  },
];

export const MOCK_MODULES = ['Connection', 'Udmi'];

export const DEVICES_FORM: QuestionFormat[] = [
  {
    question: 'What type of device is this?',
    type: FormControlType.SELECT,
    options: [
      {
        text: 'Building Automation Gateway',
        risk: ProfileRisk.HIGH,
        id: 1,
      },
      {
        text: 'IoT Gateway',
        risk: ProfileRisk.LIMITED,
        id: 2,
      },
    ],
  },
  {
    question: 'Does your device process any sensitive information? ',
    type: FormControlType.SELECT,
    options: [
      {
        id: 1,
        text: 'Yes',
        risk: ProfileRisk.LIMITED,
      },
      {
        id: 2,
        text: 'No',
        risk: ProfileRisk.HIGH,
      },
    ],
  },
  {
    question: 'Please select the technology this device falls into',
    type: FormControlType.SELECT,
    options: [
      { text: 'Hardware - Access Control' },
      { text: 'Hardware - Air quality' },
    ],
  },
];
