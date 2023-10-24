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
import {ComponentFixture, TestBed} from '@angular/core/testing';

import {FilterDialogComponent} from './filter-dialog.component';
import {CommonModule} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {FilterName} from '../../model/filters';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';

describe('FilterDialogComponent', () => {
  let component: FilterDialogComponent;
  let fixture: ComponentFixture<FilterDialogComponent>;
  let compiled: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        FilterDialogComponent,
        CommonModule,
        NoopAnimationsModule,
        MatDialogModule,
        MatButtonModule,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatCheckboxModule,
        MatDatepickerModule,
        MatNativeDateModule
      ],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
            updateSize: () => {},
            updatePosition: () => {}
          }
        },
        {provide: MAT_DIALOG_DATA, useValue: {}},
      ]
    });
    fixture = TestBed.createComponent(FilterDialogComponent);
    component = fixture.componentInstance;

    const mockData = {left: 0, bottom: 0};
    const mockClientRest = {
      nativeElement: {
        getBoundingClientRect: () => mockData
      }
    }
    component.data = {
      trigger: mockClientRest,
      filter: FilterName.DeviceInfo,
      availableStatuses: ['Compliant']
    }
    component.data.trigger.nativeElement = {getBoundingClientRect: () => mockData};
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog on "cancel" click', () => {
    const closeSpy = spyOn(component.dialogRef, 'close');
    const closeButton = compiled.querySelector('.cancel-button') as HTMLButtonElement;

    closeButton?.click();

    expect(closeSpy).toHaveBeenCalledWith();

    closeSpy.calls.reset();
  });

  it('should close dialog with data on "confirm" click', () => {
    const mockFormData = { deviceInfo: '', deviceFirmware: '', results: [ 'Compliant' ], dateRange: { start: null, end: null } };
    const closeSpy = spyOn(component.dialogRef, 'close');
    const confirmButton = compiled.querySelector('.confirm-button') as HTMLButtonElement;

    confirmButton?.click();

    expect(closeSpy).toHaveBeenCalledWith(mockFormData);

    closeSpy.calls.reset();
  });

  it('#selectedChange should set date range data', () => {
    const mockDate = 'Wed Jun 21 2023 00:00:00 GMT+0000';
    const mockDate2 = 'Thu Jun 22 2023 00:00:00 GMT+0000';

    component.selectedChange(mockDate);
    expect(component.range).toEqual({start: mockDate, end: null});

    component.selectedChange(mockDate2);
    expect(component.range).toEqual({start: mockDate2, end: mockDate});
  });
});
