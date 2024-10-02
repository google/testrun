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

import { SuccessDialogComponent } from './success-dialog.component';
import { TestRunService } from '../../../../services/test-run.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { PROFILE_MOCK } from '../../../../mocks/profile.mock';
import { ProfileRisk } from '../../../../model/profile';

describe('SuccessDialogComponent', () => {
  let component: SuccessDialogComponent;
  let fixture: ComponentFixture<SuccessDialogComponent>;
  const testRunServiceMock = jasmine.createSpyObj(['getRiskClass']);
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuccessDialogComponent],
      providers: [
        { provide: TestRunService, useValue: testRunServiceMock },
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
    fixture = TestBed.createComponent(SuccessDialogComponent);
    component = fixture.componentInstance;
    component.data = {
      profile: PROFILE_MOCK,
    };
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog on "cancel" click', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const confirmButton = compiled.querySelector(
      '.confirm-button'
    ) as HTMLButtonElement;

    confirmButton?.click();

    expect(closeSpy).toHaveBeenCalled();

    closeSpy.calls.reset();
  });

  it('should return proper text for risk', () => {
    expect(component.getRiskExplanation(ProfileRisk.LIMITED)).toEqual(
      'Your device is eligible for most networks.'
    );
    expect(component.getRiskExplanation(ProfileRisk.HIGH)).toEqual(
      'Your device is eligible only for some networks.'
    );
  });
});
