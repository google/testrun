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

import { Profile } from '../model/profile';
import { FormControlType, ProfileFormat } from '../model/profile';

export const PROFILE_MOCK: Profile = {
  name: 'Profile name',
  sections: [],
};

export const PROFILE_MOCK_2: Profile = {
  name: 'Second profile name',
  sections: [],
};

export const PROFILE_FORM: ProfileFormat[] = [
  {
    question: 'Email',
    type: FormControlType.TEXT,
    validation: {
      required: true,
    },
  },
  {
    question: 'What type of device do you need reviewed?',
    type: FormControlType.TEXT,
    validation: {
      required: true,
    },
    description: 'This tells us about the device',
  },
  {
    question:
      'Has this device already been through a criticality assessment with testrun?',
    type: FormControlType.SELECT,
    options: [],
    validation: {
      max: '128',
      required: true,
    },
  },
  {
    question: 'What features does the device have?',
    description:
      'This tells us about the data your device will collectThis tells us about the data your device will collect',
    type: FormControlType.SELECT_MULTIPLE,
    options: ['Wi-fi', 'Bluetooth', 'ZigBee / Z-Wave / Thread / Matter'],
    validation: {
      required: true,
    },
  },
  {
    question: 'Comments',
    type: FormControlType.TEXT,
    description: 'Please enter any comments here',
  },
];
