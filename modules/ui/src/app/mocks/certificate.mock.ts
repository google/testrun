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
import { Certificate } from '../model/certificate';

export const certificate = {
  name: 'iot.bms.google.com',
  organisation: 'Google, Inc.',
  expires: '2024-09-01T09:00:12Z',
} as Certificate;

export const certificate_uploading = {
  name: 'name',
  uploading: true,
  errors: [],
} as Certificate;

export const certificate_uploading_with_errors = {
  name: 'some very long strange name with symbols!?',
  uploading: true,
  errors: [
    'The file name should be alphanumeric, symbols  -_. are allowed.',
    'Max name length is 24 characters.',
    'File size should be a max of 4KB',
  ],
} as Certificate;

export const certificate2 = {
  name: 'sensor.bms.google.com',
  organisation: 'Google, Inc.',
  expires: '2024-09-01T09:00:12Z',
} as Certificate;

export const INVALID_FILE = {
  name: 'some very long strange name with symbols!?',
  size: 7000,
} as File;

export const FILE = {
  name: 'name',
  size: 3000,
} as File;
