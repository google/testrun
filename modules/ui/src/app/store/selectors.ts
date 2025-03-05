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

import { createFeatureSelector, createSelector } from '@ngrx/store';
import * as fromApp from './reducers';
import { AppState } from './state';

export const selectAppState = createFeatureSelector<AppState>(
  fromApp.appFeatureKey
);

export const selectInterfaces = createSelector(
  selectAppState,
  (state: AppState) => state.interfaces
);

export const selectHasConnectionSettings = createSelector(
  selectAppState,
  (state: AppState) => state.hasConnectionSettings
);

export const selectIsOpenAddDevice = createSelector(
  selectAppState,
  (state: AppState) => state.isOpenAddDevice
);

export const selectHasDevices = createSelector(
  selectAppState,
  (state: AppState) => state.hasDevices
);

export const selectHasExpiredDevices = createSelector(
  selectAppState,
  (state: AppState) => state.hasExpiredDevices
);
export const selectIsAllDevicesOutdated = createSelector(
  selectAppState,
  (state: AppState) => state.isAllDevicesOutdated
);

export const selectDevices = createSelector(
  selectAppState,
  (state: AppState) => state.devices
);

export const selectDeviceInProgress = createSelector(
  selectAppState,
  (state: AppState) => state.deviceInProgress
);

export const selectHasRiskProfiles = createSelector(
  selectAppState,
  (state: AppState) => state.hasRiskProfiles
);

export const selectRiskProfiles = createSelector(
  selectAppState,
  (state: AppState) => state.riskProfiles
);

export const selectSystemStatus = createSelector(
  selectAppState,
  (state: AppState) => {
    return state.systemStatus;
  }
);

export const selectIsTestingComplete = createSelector(
  selectAppState,
  (state: AppState) => state.isTestingComplete
);

export const selectIsOpenWaitSnackBar = createSelector(
  selectAppState,
  (state: AppState) => state.isOpenWaitSnackBar
);

export const selectIsOpenStartTestrun = createSelector(
  selectAppState,
  (state: AppState) => state.isOpenStartTestrun
);

export const selectStatus = createSelector(
  selectAppState,
  (state: AppState) => state.status
);

export const selectReports = createSelector(
  selectAppState,
  (state: AppState) => state.reports
);

export const selectTestModules = createSelector(
  selectAppState,
  (state: AppState) => state.testModules
);

export const selectAdapters = createSelector(
  selectAppState,
  (state: AppState) => state.adapters
);

export const selectInternetConnection = createSelector(
  selectAppState,
  (state: AppState) => state.internetConnection
);

export const selectSystemConfig = createSelector(
  selectAppState,
  (state: AppState) => state.systemConfig
);

export const selectIsOpenCreateProfile = createSelector(
  selectAppState,
  (state: AppState) => state.isOpenCreateProfile
);
