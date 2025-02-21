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

import { FilterDialogComponent } from './filter-dialog.component';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDatepickerInputEvent,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { DateRange, FilterName, FilterTitle } from '../../../../model/filters';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

describe('FilterDialogComponent', () => {
  let component: FilterDialogComponent;
  let fixture: ComponentFixture<FilterDialogComponent>;
  let compiled: HTMLElement;
  const mockData = { left: 0, bottom: 0 };
  const mockClientRest = {
    nativeElement: {
      getBoundingClientRect: () => mockData,
    },
  };

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
        MatNativeDateModule,
      ],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            keydownEvents: () => of(new KeyboardEvent('keydown', { code: '' })),
            close: () => ({}),
            updateSize: () => ({}),
            updatePosition: () => ({}),
          },
        },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    });
    fixture = TestBed.createComponent(FilterDialogComponent);
    component = fixture.componentInstance;

    component.data = {
      trigger: mockClientRest,
      filter: FilterName.DeviceInfo,
      title: FilterTitle.DeviceInfo,
    };
    component.data.trigger.nativeElement = {
      getBoundingClientRect: () => mockData,
    };
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

    expect(closeSpy).toHaveBeenCalledWith();

    closeSpy.calls.reset();
  });

  it('should close dialog with data on "confirm" click', () => {
    fixture.detectChanges();
    component.filterForm.get('deviceInfo')?.setValue('deviceInfo  ');
    const mockFormData = {
      deviceInfo: 'deviceInfo',
      deviceFirmware: '',
      results: [],
      dateRange: new DateRange(),
    };
    const closeSpy = spyOn(component.dialogRef, 'close');
    const confirmButton = compiled.querySelector(
      '.confirm-button'
    ) as HTMLButtonElement;

    confirmButton?.click();

    expect(closeSpy).toHaveBeenCalledWith(mockFormData);

    closeSpy.calls.reset();
  });

  it('should not close dialog with invalid date on "confirm" click', () => {
    fixture.detectChanges();
    component.filterForm.get('deviceInfo')?.setValue('as&@3$');
    const closeSpy = spyOn(component.dialogRef, 'close');
    const confirmButton = compiled.querySelector(
      '.confirm-button'
    ) as HTMLButtonElement;

    confirmButton?.click();

    expect(closeSpy).not.toHaveBeenCalled();

    closeSpy.calls.reset();
  });

  it('should have "invalid_format" error if field does not satisfy validation rules', () => {
    [
      'very long value very long value very long value very long value very long value very long value very long',
      'as&@3$',
    ].forEach(value => {
      component.data = {
        trigger: mockClientRest,
        filter: FilterName.DeviceFirmware,
        title: FilterTitle.DeviceFirmware,
      };
      fixture.detectChanges();

      const firmware: HTMLInputElement = compiled.querySelector(
        '.firmware-input'
      ) as HTMLInputElement;
      firmware.value = value;
      firmware.dispatchEvent(new Event('input'));
      component.deviceFirmware.markAsTouched();
      fixture.detectChanges();

      const firmwareError = compiled.querySelector('mat-error')?.innerHTML;
      const error = component.deviceFirmware.hasError('invalid_format');

      expect(error).toBeTruthy();
      expect(firmwareError).toContain(
        'The firmware name must be a maximum of 64 characters. Only letters, numbers, and accented letters are permitted.'
      );
    });
  });

  describe('date filter', () => {
    beforeEach(() => {
      component.data = {
        trigger: mockClientRest,
        filter: FilterName.Started,
        title: FilterTitle.Started,
      };
      fixture.detectChanges();
    });

    it('#selectedChange should set date range data', () => {
      const mockDate = new Date('Wed Jun 21 2023 00:00:00 GMT+0000');
      const mockDate2 = new Date('Thu Jun 22 2023 00:00:00 GMT+0000');
      const range = new DateRange();
      range.start = mockDate;
      range.end = null;

      component.selectedChange(mockDate);

      expect(component.range).toEqual(range);

      range.end = mockDate2;
      component.selectedChange(mockDate2);

      expect(component.range).toEqual(range);
    });

    it('#startDateChanged should set date range data', () => {
      const mockDate = new Date('Wed Jun 21 2023 00:00:00 GMT+0000');
      component.startDateChanged({
        value: mockDate,
      } as MatDatepickerInputEvent<Date>);

      expect(component.selectedRangeValue?.end).toEqual(null);
      expect(component.selectedRangeValue?.start).toEqual(mockDate);
    });

    it('#startDateChanged should replace year if selected year later than current', () => {
      const mockDate = new Date('Wed Jun 21 99999 00:00:00 GMT+0000');
      const currentDate = new Date(mockDate);
      currentDate.setFullYear(new Date().getFullYear());

      component.startDateChanged({
        value: mockDate,
      } as MatDatepickerInputEvent<Date>);

      expect(component.selectedRangeValue?.start).toEqual(currentDate);
      expect(component.range.start).toEqual(currentDate);
    });

    it('#endDateChanged should set date range data', () => {
      const mockDate = new Date('Wed Jun 21 2023 00:00:00 GMT+0000');
      component.endDateChanged({
        value: mockDate,
      } as MatDatepickerInputEvent<Date>);

      expect(component.selectedRangeValue?.start).toEqual(null);
      expect(component.selectedRangeValue?.end).toEqual(mockDate);
    });

    it('#endDateChanged should replace year if selected year later than current', () => {
      const mockDate = new Date('Wed Jun 21 99999 00:00:00 GMT+0000');
      const currentDate = new Date(mockDate);
      currentDate.setFullYear(new Date().getFullYear());

      component.endDateChanged({
        value: mockDate,
      } as MatDatepickerInputEvent<Date>);

      expect(component.selectedRangeValue?.end).toEqual(currentDate);
      expect(component.range.end).toEqual(currentDate);
    });

    it('should max date as today', () => {
      expect(component.calendar()?.maxDate?.getDate()).toBe(
        new Date().getDate()
      );
    });
  });
});
