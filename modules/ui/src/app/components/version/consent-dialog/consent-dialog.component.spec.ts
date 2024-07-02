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
    component.data = { version: NEW_VERSION, hasRiskProfiles: false };
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
    const dialogRes = { grant: true, isNavigateToRiskAssessment: undefined };

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
    const dialogRes = { grant: false, isNavigateToRiskAssessment: undefined };

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

  describe('with new version available', () => {
    beforeEach(() => {
      component.data = { version: NEW_VERSION, hasRiskProfiles: false };
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
      component.data = { version: VERSION, hasRiskProfiles: false };
      fixture.detectChanges();
    });

    it('should not has consent content', () => {
      const content = compiled.querySelector(
        '.section-content.consent'
      ) as HTMLElement;

      expect(content).toBeNull();
    });
  });

  describe('with no risk assessment profiles', () => {
    beforeEach(() => {
      component.data = { version: VERSION, hasRiskProfiles: false };
      fixture.detectChanges();
    });

    it('should has risk-assessment content', () => {
      const content = compiled.querySelector(
        '.section-content.risk-assessment'
      ) as HTMLElement;

      const innerContent = content.innerHTML.trim();
      expect(innerContent).toContain(
        'Now you can answer a short questionnaire'
      );
    });

    it('should close dialog with isNavigateToRiskAssessment as true when click "confirm"', () => {
      const closeSpy = spyOn(component.dialogRef, 'close');
      const riskAssessmentBtn = compiled.querySelector(
        '.risk-assessment-button'
      ) as HTMLButtonElement;
      const dialogRes = { grant: true, isNavigateToRiskAssessment: true };

      riskAssessmentBtn?.click();

      expect(closeSpy).toHaveBeenCalledWith(dialogRes);

      closeSpy.calls.reset();
    });
  });

  describe('with risk assessment profiles', () => {
    beforeEach(() => {
      component.data = { version: VERSION, hasRiskProfiles: true };
      fixture.detectChanges();
    });

    it('should not has risk-assessment content', () => {
      const content = compiled.querySelector(
        '.section-content.risk-assessment'
      ) as HTMLElement;

      expect(content).toBeNull();
    });
  });
});
