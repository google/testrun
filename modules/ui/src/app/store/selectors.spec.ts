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
import { AppState } from './state';
import { selectInterfaces, selectMenuOpened } from './selectors';

describe('Selectors', () => {
  const initialState: AppState = {
    appComponent: {
      isMenuOpen: false,
      interfaces: {},
      isStatusLoaded: false,
      devicesLength: 0,
      focusNavigation: false,
    },
  };

  it('should select the is menu opened', () => {
    const result = selectMenuOpened.projector(initialState);
    expect(result).toEqual(false);
  });

  it('should select interfaces', () => {
    const result = selectInterfaces.projector(initialState);
    expect(result).toEqual({});
  });
});
