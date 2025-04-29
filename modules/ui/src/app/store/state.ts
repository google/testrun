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
import { TestrunStatus } from '../model/testrun-status';
import { Device, TestModule } from '../model/device';
import { Adapters, SystemConfig, SystemInterfaces } from '../model/setting';
import { Profile } from '../model/profile';

export interface AppState {
  // app, settings
  interfaces: SystemInterfaces;
  systemConfig: SystemConfig;
  devices: Device[];
  //used in app, devices, testrun
  hasDevices: boolean;
  hasExpiredDevices: boolean;
  isAllDevicesOutdated: boolean;
  //app, risk-assessment, testrun, reports
  riskProfiles: Profile[];
  hasRiskProfiles: boolean;
  //app, testrun
  status: string | null;
  systemStatus: TestrunStatus | null;
  isTestingComplete: boolean;
  //app, settings
  hasConnectionSettings: boolean | null;
  // app, devices
  isOpenAddDevice: boolean;
  // app, testrun
  isOpenStartTestrun: boolean;
  isStopTestrun: boolean;
  isOpenWaitSnackBar: boolean;
  deviceInProgress: Device | null;
  reports: TestrunStatus[];
  testModules: TestModule[];
  adapters: Adapters;
  internetConnection: boolean | null;
  isOpenCreateProfile: boolean;
}

export const initialState: AppState = {
  hasConnectionSettings: null,
  isOpenAddDevice: false,
  isStopTestrun: false,
  isOpenWaitSnackBar: false,
  hasDevices: false,
  hasExpiredDevices: false,
  isAllDevicesOutdated: false,
  devices: [],
  deviceInProgress: null,
  riskProfiles: [],
  hasRiskProfiles: false,
  isOpenStartTestrun: false,
  systemStatus: null,
  isTestingComplete: false,
  status: null,
  reports: [],
  testModules: [],
  adapters: {},
  internetConnection: null,
  interfaces: {},
  systemConfig: { network: {} },
  isOpenCreateProfile: false,
};
