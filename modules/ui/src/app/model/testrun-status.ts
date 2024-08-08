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
import { Device } from './device';

export interface TestrunStatus {
  mac_addr: string | null;
  status: string;
  device: IDevice;
  started: string | null;
  finished: string | null;
  tests?: TestsResponse;
  report: string;
}

export interface HistoryTestrun extends TestrunStatus {
  deviceFirmware: string;
  deviceInfo: string;
  duration: string;
}

export interface TestsData {
  total?: number;
  results?: IResult[];
}

export type TestsResponse = TestsData | IResult[];

export interface IDevice extends Device {
  firmware: string;
}

export interface IResult {
  name: string;
  description: string;
  result: string;
  recommendations?: string[];
}

export enum StatusOfTestrun {
  InProgress = 'In Progress',
  WaitingForDevice = 'Waiting for Device',
  Cancelled = 'Cancelled',
  Cancelling = 'Cancelling',
  Failed = 'Failed',
  Compliant = 'Compliant', // used for Completed
  CompliantLimited = 'Compliant (Limited)',
  CompliantHigh = 'Compliant (High)',
  NonCompliant = 'Non-Compliant', // used for Completed
  SmartReady = 'Smart Ready', // used for Completed
  Idle = 'Idle',
  Monitoring = 'Monitoring',
  Error = 'Error',
}

export enum StatusOfTestResult {
  Compliant = 'Compliant', // device supports feature
  CompliantLimited = 'Compliant (Limited)',
  CompliantHigh = 'Compliant (High)',
  SmartReady = 'Smart Ready',
  NonCompliant = 'Non-Compliant', // device does not support feature but feature is required
  NotDetected = 'Feature Not Detected',
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  Error = 'Error', // test failed to run
  Info = 'Informational', // nice to know information, not necessarily compliant/non-compliant,
  Skipped = 'Skipped',
  Disabled = 'Disabled',
}

export interface StatusResultClassName {
  green: boolean;
  red: boolean;
  blue: boolean;
  grey: boolean;
}

export const IDLE_STATUS = {
  status: StatusOfTestrun.Idle,
  device: {} as IDevice,
  started: null,
  finished: null,
  report: '',
  mac_addr: '',
  tests: {
    total: 0,
    results: [],
  },
} as TestrunStatus;

export type TestrunStatusKey = keyof typeof StatusOfTestrun;
export type TestrunStatusValue = (typeof StatusOfTestrun)[TestrunStatusKey];
export type TestResultKey = keyof typeof StatusOfTestResult;
export type TestResultValue = (typeof StatusOfTestResult)[TestResultKey];
