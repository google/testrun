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
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsentDialogComponent } from './consent-dialog.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { of } from 'rxjs';
import { NEW_VERSION, VERSION } from '../../../mocks/version.mock';

describe('ConsentDialogComponent', () => {
  let component: ConsentDialogComponent;
  let fixture: ComponentFixture<ConsentDialogComponent>;
  let compiled: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConsentDialogComponent, MatDialogModule, MatButtonModule],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            keydownEvents: () => of(new KeyboardEvent('keydown', { code: '' })),
            close: () => ({}),
          },
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
    fixture = TestBed.createComponent(ConsentDialogComponent);
    component = fixture.componentInstance;
    component.data = NEW_VERSION;
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog on "cancel" click', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const closeButton = compiled.querySelector(
      '.cancel-button'
    ) as HTMLButtonElement;

    closeButton?.click();

    expect(closeSpy).toHaveBeenCalledWith(false);

    closeSpy.calls.reset();
  });

  it('should close dialog on "confirm" click', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const confirmButton = compiled.querySelector(
      '.confirm-button'
    ) as HTMLButtonElement;

    confirmButton?.click();

    expect(closeSpy).toHaveBeenCalledWith(true);

    closeSpy.calls.reset();
  });

  it('should not close dialog on download link click', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const confirmButton = compiled.querySelector(
      '.download-link'
    ) as HTMLAnchorElement;

    confirmButton?.click();

    expect(closeSpy).toHaveBeenCalledTimes(0);
  });

  describe('with new version available', () => {
    beforeEach(() => {
      component.data = NEW_VERSION;
      fixture.detectChanges();
    });

    it('should has content', () => {
      const content = compiled.querySelector(
        '.consent-update-content'
      ) as HTMLElement;

      const innerContent = content.innerHTML.trim();
      expect(innerContent).toContain(
        'You are currently using an outdated software'
      );
      expect(innerContent).toContain('v1');
      expect(innerContent).toContain('v2');
      expect(innerContent).toContain(
        'Please consider to update or continue at your own risk.'
      );
    });
  });

  describe('with no new version available', () => {
    beforeEach(() => {
      component.data = VERSION;
      fixture.detectChanges();
    });

    it('should has content', () => {
      const content = compiled.querySelector(
        '.consent-update-content'
      ) as HTMLElement;

      expect(content).toBeNull();
    });
  });
});
