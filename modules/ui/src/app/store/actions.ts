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

import { createAction, props } from '@ngrx/store';
import { SystemInterfaces } from '../services/test-run.service';

// App component
export const toggleMenu = createAction('[App Component] Toggle Menu');

export const fetchInterfaces = createAction('[App Component] Fetch Interfaces');

export const fetchInterfacesSuccess = createAction(
  '[App Component] Fetch interfaces Success',
  props<{ interfaces: SystemInterfaces }>()
);

export const updateFocusNavigation = createAction(
  '[App Component] update focus navigation',
  props<{ focusNavigation: boolean }>()
);
