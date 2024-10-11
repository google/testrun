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

export const selectMenuOpened = createSelector(
  selectAppState,
  (state: AppState) => state.appComponent.isMenuOpen
);

export const selectInterfaces = createSelector(
  selectAppState,
  (state: AppState) => state.appComponent.interfaces
);

export const selectHasConnectionSettings = createSelector(
  selectAppState,
  (state: AppState) => state.shared.hasConnectionSettings
);

export const selectIsOpenAddDevice = createSelector(
  selectAppState,
  (state: AppState) => state.shared.isOpenAddDevice
);

export const selectHasDevices = createSelector(
  selectAppState,
  (state: AppState) => state.shared.hasDevices
);

export const selectHasExpiredDevices = createSelector(
  selectAppState,
  (state: AppState) => state.shared.hasExpiredDevices
);
export const selectIsAllDevicesOutdated = createSelector(
  selectAppState,
  (state: AppState) => state.shared.isAllDevicesOutdated
);

export const selectDevices = createSelector(
  selectAppState,
  (state: AppState) => state.shared.devices
);

export const selectDeviceInProgress = createSelector(
  selectAppState,
  (state: AppState) => state.shared.deviceInProgress
);

export const selectHasRiskProfiles = createSelector(
  selectAppState,
  (state: AppState) => state.shared.hasRiskProfiles
);

export const selectRiskProfiles = createSelector(
  selectAppState,
  (state: AppState) => state.shared.riskProfiles
);

export const selectError = createSelector(
  selectAppState,
  (state: AppState) => state.appComponent.settingMissedError
);

export const selectSystemStatus = createSelector(
  selectAppState,
  (state: AppState) => {
    return state.shared.systemStatus;
  }
);

export const selectIsTestingComplete = createSelector(
  selectAppState,
  (state: AppState) => state.shared.isTestingComplete
);

export const selectIsOpenWaitSnackBar = createSelector(
  selectAppState,
  (state: AppState) => state.shared.isOpenWaitSnackBar
);

export const selectIsOpenStartTestrun = createSelector(
  selectAppState,
  (state: AppState) => state.shared.isOpenStartTestrun
);

export const selectStatus = createSelector(
  selectAppState,
  (state: AppState) => state.shared.status
);

export const selectReports = createSelector(
  selectAppState,
  (state: AppState) => state.shared.reports
);

export const selectTestModules = createSelector(
  selectAppState,
  (state: AppState) => state.shared.testModules
);

export const selectAdapters = createSelector(
  selectAppState,
  (state: AppState) => state.shared.adapters
);

export const selectInternetConnection = createSelector(
  selectAppState,
  (state: AppState) => state.shared.internetConnection
);
