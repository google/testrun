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

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SnackBarComponent } from './snack-bar.component';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from '../../store/state';
import { MatSnackBarRef } from '@angular/material/snack-bar';
import { setIsOpenWaitSnackBar, setIsStopTestrun } from '../../store/actions';

describe('SnackBarComponent', () => {
  let component: SnackBarComponent;
  let fixture: ComponentFixture<SnackBarComponent>;
  let compiled: HTMLElement;
  let store: MockStore<AppState>;

  const MatSnackBarRefMock = {
    open: () => ({}),
    dismiss: () => ({}),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnackBarComponent],
      providers: [
        { provide: MatSnackBarRef, useValue: MatSnackBarRefMock },
        provideMockStore({}),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SnackBarComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(MockStore);
    compiled = fixture.nativeElement as HTMLElement;
    spyOn(store, 'dispatch').and.callFake(() => {});
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should dispatch setIsStopTestrun action', () => {
    const actionBtnStop = compiled.querySelector(
      '.action-btn.stop'
    ) as HTMLButtonElement;

    actionBtnStop.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      setIsStopTestrun({ isStopTestrun: true })
    );
  });

  it('should dispatch setIsOpenWaitSnackBar action', () => {
    const actionBtnWait = compiled.querySelector(
      '.action-btn.wait'
    ) as HTMLButtonElement;

    actionBtnWait.click();

    expect(store.dispatch).toHaveBeenCalledWith(
      setIsOpenWaitSnackBar({ isOpenWaitSnackBar: false })
    );
  });
});
