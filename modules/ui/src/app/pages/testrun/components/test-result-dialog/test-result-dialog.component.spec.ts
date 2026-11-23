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
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestResultDialogComponent } from './test-result-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { TEST_DATA_RESULT_WITH_RECOMMENDATIONS } from '../../../../mocks/testrun.mock';
import {
  RequiredResult,
  StatusOfTestResult,
} from '../../../../model/testrun-status';

describe('TestResultDialogComponent', () => {
  let component: TestResultDialogComponent;
  let fixture: ComponentFixture<TestResultDialogComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestResultDialogComponent],
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
    }).compileComponents();

    fixture = TestBed.createComponent(TestResultDialogComponent);
    component = fixture.componentInstance;
    component.data = {
      testResult: TEST_DATA_RESULT_WITH_RECOMMENDATIONS[0],
    };
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog on click "Close" button', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const closeButton = compiled.querySelector(
      '.close-button'
    ) as HTMLButtonElement;

    closeButton?.click();

    expect(closeSpy).toHaveBeenCalled();

    closeSpy.calls.reset();
  });

  it('should list the steps to resolve under their label', () => {
    const steps = Array.from(
      compiled.querySelectorAll('.info-steps-list li')
    ).map(step => step.textContent?.trim());

    expect(compiled.querySelector('.info-label.steps')?.textContent).toBe(
      'Steps to resolve'
    );
    expect(steps).toEqual([
      'An example of a step to resolve',
      'Disable any running NTP server',
    ]);
  });

  describe('for an error result with details only', () => {
    beforeEach(() => {
      component.data = {
        testResult: {
          name: 'ntp.network.ntp_support',
          description: 'An error occurred whilst running this test',
          result: StatusOfTestResult.Error,
          details: 'NTP server capture file not found',
          required_result: RequiredResult.Required,
        },
      };
      fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
      fixture.detectChanges();
    });

    it('should show the details without an empty "Steps to resolve" section', () => {
      expect(compiled.textContent).not.toContain('Steps to resolve');
      expect(compiled.querySelector('ul')).toBeNull();
      expect(compiled.querySelector('.info-details')?.textContent?.trim()).toBe(
        'NTP server capture file not found'
      );
    });
  });
});
