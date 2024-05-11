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

export const selectDevices = createSelector(
  selectAppState,
  (state: AppState) => state.shared.devices
);

export const selectError = createSelector(
  selectAppState,
  (state: AppState) => state.appComponent.settingMissedError
);
