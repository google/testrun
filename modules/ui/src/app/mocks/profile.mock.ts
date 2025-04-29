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

import { Profile, ProfileFormat, ProfileStatus } from '../model/profile';
import { FormControlType } from '../model/question';

export const PROFILE_MOCK: Profile = {
  name: 'Primary profile',
  status: ProfileStatus.VALID,
  created: '2024-05-23 12:38:26',
  questions: [
    {
      question: 'What is the email of the device owner(s)?',
      answer: 'boddey@google.com, cmeredith@google.com',
    },
    {
      question: 'What type of device do you need reviewed?',
      answer: 'IoT Sensor',
    },
    {
      question: 'Are any of the following statements true about your device?',
      answer: 'First',
    },
    {
      question: 'What features does the device have?',
      answer: [0, 1, 2],
    },
    {
      question: 'Comments',
      answer: 'Yes',
    },
  ],
};

export const PROFILE_MOCK_2: Profile = {
  status: ProfileStatus.VALID,
  name: 'Second profile name',
  questions: [],
};

export const PROFILE_MOCK_3: Profile = {
  status: ProfileStatus.DRAFT,
  name: 'Third profile name',
  questions: [],
};

export const PROFILE_FORM: ProfileFormat[] = [
  {
    question: 'What is the email of the device owner(s)?',
    type: FormControlType.EMAIL_MULTIPLE,
    validation: {
      required: true,
      max: '30',
    },
  },
  {
    question: 'What type of device do you need reviewed?',
    type: FormControlType.TEXTAREA,
    validation: {
      required: true,
      max: '28',
    },
    description: 'This tells us about the device',
  },
  {
    question: 'Are any of the following statements true about your device?',
    type: FormControlType.SELECT,
    options: ['First', 'Second'],
    validation: {
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
    validation: {
      max: '28',
      required: true,
    },
  },
];

export const NEW_PROFILE_MOCK = {
  status: ProfileStatus.VALID,
  name: 'New profile',
  questions: [
    {
      question: 'What is the email of the device owner(s)?',
      answer: 'a@test.te;b@test.te, c@test.te',
    },
    {
      question: 'What type of device do you need reviewed?',
      answer: 'test',
    },
    {
      question: 'Are any of the following statements true about your device?',
      answer: 'test',
    },
    {
      question: 'What features does the device have?',
      answer: [0, 1, 2],
    },
    { question: 'Comments', answer: 'test' },
  ],
};

export const NEW_PROFILE_MOCK_DRAFT = {
  status: ProfileStatus.DRAFT,
  name: 'New profile',
  questions: [
    { question: 'What is the email of the device owner(s)?', answer: '' },
    {
      question: 'What type of device do you need reviewed?',
      answer: '',
    },
    {
      question: 'Are any of the following statements true about your device?',
      answer: '',
    },
    {
      question: 'What features does the device have?',
      answer: [],
    },
    { question: 'Comments', answer: '' },
  ],
};

export const RENAME_PROFILE_MOCK = {
  ...NEW_PROFILE_MOCK,
  name: 'Primary profile',
  rename: 'New profile',
};

export const COPY_PROFILE_MOCK: Profile = {
  name: 'Copy of Primary profile',
  status: ProfileStatus.VALID,
  created: '2025-05-23 12:38:26',
  questions: [
    {
      question: 'What is the email of the device owner(s)?',
      answer: 'boddey@google.com, cmeredith@google.com',
    },
    {
      question: 'What type of device do you need reviewed?',
      answer: 'IoT Sensor',
    },
    {
      question: 'Are any of the following statements true about your device?',
      answer: 'First',
    },
    {
      question: 'What features does the device have?',
      answer: [0, 1, 2],
    },
    {
      question: 'Comments',
      answer: 'Yes',
    },
  ],
};

export const DRAFT_COPY_PROFILE_MOCK: Profile = {
  name: 'Copy of Primary profile',
  status: ProfileStatus.DRAFT,
  questions: [
    {
      question: 'What is the email of the device owner(s)?',
      answer: 'boddey@google.com, cmeredith@google.com',
    },
    {
      question: 'What type of device do you need reviewed?',
      answer: 'IoT Sensor',
    },
    {
      question: 'Are any of the following statements true about your device?',
      answer: 'First',
    },
    {
      question: 'What features does the device have?',
      answer: [0, 1, 2],
    },
    {
      question: 'Comments',
      answer: 'Yes',
    },
  ],
};

export const OUTDATED_DRAFT_PROFILE_MOCK: Profile = {
  name: 'Outdated profile',
  status: ProfileStatus.DRAFT,
  questions: [
    {
      question: 'Old question',
      answer: 'qwerty',
    },
    {
      question: 'What is the email of the device owner(s)?',
      answer: '',
    },
    {
      question: 'What type of device do you need reviewed?',
      answer: 'IoT Sensor',
    },
    {
      question: 'Another old question',
      answer: 'qwerty',
    },
  ],
};

export const EXPIRED_PROFILE_MOCK: Profile = Object.assign({}, PROFILE_MOCK, {
  status: ProfileStatus.EXPIRED,
});
