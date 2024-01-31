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

import { Device } from '../model/device';
import { TestrunStatus } from '../model/testrun-status';
import { SystemInterfaces } from '../services/test-run.service';
import { SystemConfig } from '../model/setting';

export interface AppState {
  appComponent: AppComponentState;
  settings: SettingsState;
  shared: SharedState;
}

export interface AppComponentState {
  isMenuOpen: boolean;
  interfaces: SystemInterfaces;
  /**
   * Indicates, if side menu should be focused on keyboard navigation after menu is opened
   */
  focusNavigation: boolean;
  error: boolean;
  isStatusLoaded: boolean; // TODO should be updated in effect when fetch status
  devicesLength: number; // TODO should be renamed to focusToggleSettingsBtn (true when devices.length > 0) and updated in effect when fetch device
}

export interface SharedState {
  //used in app, devices, testrun
  devices?: Device[] | null;
  //app, testrun
  systemStatus?: TestrunStatus | null;
  //app, testrun
  isTestrunStarted?: boolean;
  //app, settings
  hasConnectionSettings: boolean;
}

export interface SettingsState {
  systemConfig: SystemConfig;
}

export const initialAppComponentState: AppComponentState = {
  isMenuOpen: false,
  interfaces: {},
  focusNavigation: false,
  isStatusLoaded: false,
  devicesLength: 0,
  error: false,
};

export const initialSettingsState: SettingsState = {
  systemConfig: {},
};

export const initialSharedState: SharedState = {
  hasConnectionSettings: false,
};
