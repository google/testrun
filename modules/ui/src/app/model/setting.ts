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
export interface SystemConfig {
  network: {
    device_intf?: string;
    internet_intf?: string;
  } | null;
  log_level?: string;
  monitor_period?: number;
  single_intf?: boolean;
}

export interface InterfacesValidation {
  deviceValid: boolean;
  internetValid: boolean;
}

export interface SettingMissedError {
  isSettingMissed: boolean;
  devicePortMissed: boolean;
  internetPortMissed: boolean;
}

export interface SettingOption {
  key: string;
  value: string;
}

export enum FormKey {
  DEVICE = 'device_intf',
  INTERNET = 'internet_intf',
  LOG_LEVEL = 'log_level',
  MONITOR_PERIOD = 'monitor_period',
}

export type SystemInterfaces = {
  [key: string]: string;
};

export type Adapters = {
  adapters_added?: SystemInterfaces;
  adapters_removed?: SystemInterfaces;
};
