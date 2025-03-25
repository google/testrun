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
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';

import { ConsentDialogComponent } from './consent-dialog.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { of } from 'rxjs';
import { NEW_VERSION, VERSION } from '../../../mocks/version.mock';
import { MatIconTestingModule } from '@angular/material/icon/testing';

describe('ConsentDialogComponent', () => {
  let component: ConsentDialogComponent;
  let fixture: ComponentFixture<ConsentDialogComponent>;
  let compiled: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ConsentDialogComponent,
        MatDialogModule,
        MatButtonModule,
        MatIconTestingModule,
      ],
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
    component.data = { version: NEW_VERSION };
    component.optOut = false;
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog with grant as true when checkbox unchecked on "confirm" click', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const confirmButton = compiled.querySelector(
      '.confirm-button'
    ) as HTMLButtonElement;
    const dialogRes = { grant: true };

    confirmButton?.click();

    expect(closeSpy).toHaveBeenCalledWith(dialogRes);

    closeSpy.calls.reset();
  });

  it('should close dialog with grant as false when checkbox unchecked on "confirm" click', () => {
    component.optOut = true;
    fixture.detectChanges();
    const closeSpy = spyOn(component.dialogRef, 'close');
    const confirmButton = compiled.querySelector(
      '.confirm-button'
    ) as HTMLButtonElement;
    const dialogRes = { grant: false };

    confirmButton?.click();

    expect(closeSpy).toHaveBeenCalledWith(dialogRes);

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

  it('should set focus to first focusable elem when close dialog', fakeAsync(() => {
    const button = document.createElement('BUTTON');
    button.classList.add('version-content');
    document.querySelector('body')?.appendChild(button);

    const versionButton = window.document.querySelector(
      '.version-content'
    ) as HTMLButtonElement;
    const buttonFocusSpy = spyOn(versionButton, 'focus');

    component.confirm(true);
    tick(100);

    expect(buttonFocusSpy).toHaveBeenCalled();
  }));

  describe('with new version available', () => {
    beforeEach(() => {
      component.data = { version: NEW_VERSION };
      fixture.detectChanges();
    });

    it('should has consent content', () => {
      const content = compiled.querySelector(
        '.section-content.consent'
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
      component.data = { version: VERSION };
      fixture.detectChanges();
    });

    it('should not has consent content', () => {
      const content = compiled.querySelector(
        '.section-content.consent'
      ) as HTMLElement;

      expect(content).toBeNull();
    });
  });
});
