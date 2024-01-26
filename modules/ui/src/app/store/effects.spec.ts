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
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of } from 'rxjs';
import { AppEffects } from './effects';
import { TestRunService } from '../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { Action } from '@ngrx/store';
import * as actions from './actions';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from './state';
import { selectMenuOpened } from './selectors';
describe('Effects', () => {
  let actions$ = new Observable<Action>();
  let effects: AppEffects;
  let testRunServiceMock: SpyObj<TestRunService>;
  let store: MockStore<AppState>;

  beforeEach(() => {
    testRunServiceMock = jasmine.createSpyObj(['getSystemInterfaces']);
    testRunServiceMock.getSystemInterfaces.and.returnValue(of({}));
    TestBed.configureTestingModule({
      providers: [
        AppEffects,
        { provide: TestRunService, useValue: testRunServiceMock },
        provideMockActions(() => actions$),
        provideMockStore({}),
      ],
    });

    store = TestBed.inject(MockStore);
    effects = TestBed.inject(AppEffects);

    store.refreshState();
  });

  it('onFetchInterfaces$ should call fetchInterfacesSuccess on success', done => {
    actions$ = of(actions.fetchInterfaces());

    testRunServiceMock.getSystemInterfaces.and.returnValue(of({}));

    effects.onFetchInterfaces$.subscribe(action => {
      expect(action).toEqual(
        actions.fetchInterfacesSuccess({ interfaces: {} })
      );
      done();
    });
  });

  it('onMenuOpened$ should call updateFocusNavigation', done => {
    actions$ = of(actions.toggleMenu());
    store.overrideSelector(selectMenuOpened, true);
    testRunServiceMock.getSystemInterfaces.and.returnValue(of({}));

    effects.onMenuOpened$.subscribe(action => {
      expect(action).toEqual(
        actions.updateFocusNavigation({ focusNavigation: true })
      );
      done();
    });
  });
});
