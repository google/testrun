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
import { TestBed } from '@angular/core/testing';
import { skip, take } from 'rxjs';
import { AppStore, CONSENT_SHOWN_KEY } from './app.store';

const mock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: string) => {
      store[key] = value + '';
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'sessionStorage', {
  value: mock,
  writable: true,
});
describe('AppStore', () => {
  let appStore: AppStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppStore],
    });

    appStore = TestBed.inject(AppStore);
  });

  afterEach(() => {
    mock.clear();
  });

  it('should be created', () => {
    expect(appStore).toBeTruthy();
  });

  describe('updaters', () => {
    it('should update updateConsent', (done: DoneFn) => {
      appStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.consentShown).toEqual(true);
        done();
      });

      appStore.updateConsent(true);
    });
  });

  describe('selectors', () => {
    it('should select state', done => {
      appStore.viewModel$.pipe(take(1)).subscribe(store => {
        expect(store).toEqual({
          consentShown: false,
        });
        done();
      });
    });
  });

  describe('effects', () => {
    describe('setContent', () => {
      it('should update store', done => {
        appStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
          expect(store.consentShown).toEqual(true);
          done();
        });

        appStore.setContent();
      });

      it('should update store', () => {
        appStore.setContent();

        expect(mock.getItem(CONSENT_SHOWN_KEY)).toBeTruthy();
      });
    });
  });
});
