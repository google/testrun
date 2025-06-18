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
import { Question } from './profile';

export interface Device {
  manufacturer: string;
  model: string;
  mac_addr: string;
  test_modules?: TestModules;
  firmware?: string;
  status?: DeviceStatus;
  type?: string;
  technology?: string;
  test_pack?: TestingType;
  additional_info?: Question[];
  created_at: string;
  modified_at: string;
}

export enum DeviceStatus {
  VALID = 'Valid',
  INVALID = 'Invalid',
}

/**
 * Test Modules interface used to send on backend
 */
export interface TestModules {
  [key: string]: {
    enabled: boolean;
  };
}

/**
 * Test Module interface used on ui
 */
export interface TestModule {
  displayName: string;
  name: string;
  enabled: boolean;
}

export enum DeviceView {
  Basic = 'basic',
  WithActions = 'with actions',
}

export enum TestingType {
  Pilot = 'Pilot Assessment',
  Qualification = 'Device Qualification',
}

export enum DeviceAction {
  StartNewTestrun = 'Start new Testrun',
  Delete = 'Delete',
}
