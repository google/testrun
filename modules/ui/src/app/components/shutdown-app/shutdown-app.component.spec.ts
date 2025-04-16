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
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { ShutdownAppComponent } from './shutdown-app.component';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TestRunService } from '../../services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { of } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { WINDOW } from '../../providers/window.provider';
import {SimpleDialogComponent} from '../simple-dialog/simple-dialog.component';

describe('ShutdownAppComponent', () => {
  let component: ShutdownAppComponent;
  let compiled: HTMLElement;
  let fixture: ComponentFixture<ShutdownAppComponent>;
  let mockService: SpyObj<TestRunService>;

  const windowMock = {
    location: {
      reload: jasmine.createSpy('reload'),
    },
  };

  beforeEach(async () => {
    mockService = jasmine.createSpyObj(['shutdownTestrun']);

    await TestBed.configureTestingModule({
      imports: [ShutdownAppComponent, MatDialogModule, BrowserAnimationsModule],
      providers: [
        { provide: TestRunService, useValue: mockService },
        {
          provide: MatDialogRef,
          useValue: {
            close: () => ({}),
          },
        },
        { provide: WINDOW, useValue: windowMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShutdownAppComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('#openShutdownModal should call service shutdownTestrun after close', fakeAsync(() => {
    mockService.shutdownTestrun.and.returnValue(of(false));
    spyOn(component.dialog, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as MatDialogRef<typeof SimpleDialogComponent>);
    tick();

    component.openShutdownModal();

    expect(mockService.shutdownTestrun).toHaveBeenCalled();
  }));

  it('#openShutdownModal should reload window after shutdownTestrun', fakeAsync(() => {
    mockService.shutdownTestrun.and.returnValue(of(true));
    spyOn(component.dialog, 'open').and.returnValue({
      afterClosed: () => of(true),
    } as MatDialogRef<typeof SimpleDialogComponent>);
    tick();

    component.openShutdownModal();

    expect(windowMock.location.reload).toHaveBeenCalled();
  }));

  it('shutdown button should be enable', () => {
    const shutdownButton = compiled.querySelector(
      '.shutdown-button'
    ) as HTMLButtonElement;

    expect(shutdownButton.disabled).toBeFalse();
  });

  it('shutdown button should be disable', () => {
    component.disable = true;
    fixture.detectChanges();

    const shutdownButton = compiled.querySelector(
      '.shutdown-button'
    ) as HTMLButtonElement;

    expect(shutdownButton.disabled).toBeTrue();
  });
});
