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
import { ApplicationRef, ElementRef } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
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
import { ResultOfTestrun } from '../../../../model/testrun-status';
import { TestingType } from '../../../../model/device';

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
      location: '',
      linuxEnv: '',
      pythonVersion: '',
      kernel: '',
      assessmentType: '',
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

  it('should close dialog with new filter fields on "confirm" click', () => {
    fixture.detectChanges();
    component.filterForm.get('location')?.setValue('  Data Center 1  ');
    component.filterForm.get('linuxEnv')?.setValue('  Ubuntu 24.04  ');
    component.filterForm.get('pythonVersion')?.setValue('  3.11  ');
    component.filterForm.get('kernel')?.setValue('  6.8.0  ');
    component.filterForm
      .get('assessmentType')
      ?.setValue('  Pilot Assessment  ');
    component.results.controls[0].setValue(true);

    const mockFormData = {
      deviceInfo: '',
      deviceFirmware: '',
      location: 'Data Center 1',
      linuxEnv: 'Ubuntu 24.04',
      pythonVersion: '3.11',
      kernel: '6.8.0',
      assessmentType: 'Pilot Assessment',
      results: [ResultOfTestrun.Compliant],
      dateRange: new DateRange(),
    };
    const closeSpy = spyOn(component.dialogRef, 'close');
    const confirmButton = compiled.querySelector(
      '.confirm-button'
    ) as HTMLButtonElement;

    confirmButton?.click();

    expect(closeSpy).toHaveBeenCalledWith(mockFormData);
  });

  it('should auto-populate end date with today if start date is set and end date is empty on confirm', () => {
    fixture.detectChanges();
    const startDate = new Date('2024-01-01');
    component.range.start = startDate;
    component.range.end = null;

    const closeSpy = spyOn(component.dialogRef, 'close');
    component.confirm();

    expect(closeSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        dateRange: jasmine.objectContaining({
          start: startDate,
          end: jasmine.any(Date),
        }),
      })
    );
  });

  it('should not close dialog with invalid format on "confirm" click', () => {
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

  it('should provide form control getters', () => {
    fixture.detectChanges();
    expect(component.deviceInfo).toBe(component.filterForm.get('deviceInfo')!);
    expect(component.deviceFirmware).toBe(
      component.filterForm.get('deviceFirmware')!
    );
    expect(component.location).toBe(component.filterForm.get('location')!);
    expect(component.linuxEnv).toBe(component.filterForm.get('linuxEnv')!);
    expect(component.pythonVersion).toBe(
      component.filterForm.get('pythonVersion')!
    );
    expect(component.kernel).toBe(component.filterForm.get('kernel')!);
    expect(component.assessmentType).toBe(
      component.filterForm.get('assessmentType')!
    );
    expect(component.results).toBe(
      component.filterForm.controls[
        'results'
      ] as unknown as typeof component.results
    );
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

  describe('assessment type filter', () => {
    beforeEach(() => {
      component.data = {
        trigger: mockClientRest,
        filter: FilterName.AssessmentType,
        title: FilterTitle.AssessmentType,
      };
      fixture.detectChanges();
    });

    it('should render mat-select for assessment type with TestingType options', () => {
      const select = compiled.querySelector('mat-select');
      expect(select).toBeTruthy();
      expect(component.testingTypes).toEqual([
        TestingType.Pilot,
        TestingType.Qualification,
      ]);
    });

    it('should update assessmentType form control on value change', () => {
      component.filterForm
        .get('assessmentType')
        ?.setValue(TestingType.Qualification);
      expect(component.assessmentType.value).toBe(TestingType.Qualification);
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

    it('#selectedChange should swap dates if selected end is earlier than start', () => {
      const earlierDate = new Date('Wed Jun 20 2023 00:00:00 GMT+0000');
      const laterDate = new Date('Thu Jun 22 2023 00:00:00 GMT+0000');

      component.selectedChange(laterDate);
      component.selectedChange(earlierDate);

      expect(component.range.start).toEqual(earlierDate);
      expect(component.range.end).toEqual(laterDate);
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

  describe('dialog positioning and sizing', () => {
    it('should set 360px width for Started filter', () => {
      const updateSizeSpy = spyOn(component.dialogRef, 'updateSize');
      component.data = {
        trigger: mockClientRest,
        filter: FilterName.Started,
        title: FilterTitle.Started,
      };

      component.ngOnInit();
      expect(updateSizeSpy).toHaveBeenCalledWith('360px');
    });

    it('should set 240px width and offset position for Results filter without menuRect', () => {
      const updateSizeSpy = spyOn(component.dialogRef, 'updateSize');
      const updatePositionSpy = spyOn(component.dialogRef, 'updatePosition');
      component.data = {
        trigger: {
          nativeElement: {
            getBoundingClientRect: () => ({
              left: 300,
              bottom: 80,
            }),
          },
        },
        filter: FilterName.Results,
        title: FilterTitle.Results,
      };

      component.ngOnInit();
      expect(updateSizeSpy).toHaveBeenCalledWith('240px');
      expect(updatePositionSpy).toHaveBeenCalledWith({
        left: '60px',
        top: '94px',
      });
    });

    it('should position dialog to the right of menu with no padding when menuRect is provided', () => {
      const updatePositionSpy = spyOn(component.dialogRef, 'updatePosition');
      const menuRect = {
        left: 50,
        right: 250,
        top: 100,
        bottom: 400,
        width: 200,
        height: 300,
        x: 50,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect;

      component.data = {
        trigger: mockClientRest,
        filter: FilterName.DeviceInfo,
        title: FilterTitle.DeviceInfo,
        menuRect,
      };

      component.ngOnInit();

      expect(updatePositionSpy).toHaveBeenCalledWith({
        left: '250px',
        top: '100px',
      });
    });

    it('should adjust left position if menuRect overflows window width', () => {
      const updatePositionSpy = spyOn(component.dialogRef, 'updatePosition');
      const menuRect = {
        left: 800,
        right: window.innerWidth + 100,
        top: 100,
        bottom: 400,
        width: 200,
        height: 300,
        x: 800,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect;

      component.data = {
        trigger: mockClientRest,
        filter: FilterName.DeviceInfo,
        title: FilterTitle.DeviceInfo,
        menuRect,
      };

      component.ngOnInit();

      expect(updatePositionSpy).toHaveBeenCalledWith({
        left: `${window.innerWidth - 328}px`,
        top: '100px',
      });
    });

    it('should position dialog on the level with menu item when itemRect is provided', () => {
      const updatePositionSpy = spyOn(component.dialogRef, 'updatePosition');
      const menuRect = {
        left: 50,
        right: 250,
        top: 100,
        bottom: 400,
        width: 200,
        height: 300,
        x: 50,
        y: 100,
        toJSON: () => ({}),
      } as DOMRect;

      const itemRect = {
        left: 50,
        right: 250,
        top: 180,
        bottom: 220,
        width: 200,
        height: 40,
        x: 50,
        y: 180,
        toJSON: () => ({}),
      } as DOMRect;

      component.data = {
        trigger: mockClientRest,
        filter: FilterName.DeviceInfo,
        title: FilterTitle.DeviceInfo,
        menuRect,
        itemRect,
      };

      component.ngOnInit();

      expect(updatePositionSpy).toHaveBeenCalledWith({
        left: '250px',
        top: '180px',
      });
    });

    it('should fallback to trigger position when menuRect is not provided', () => {
      const updatePositionSpy = spyOn(component.dialogRef, 'updatePosition');
      component.data = {
        trigger: {
          nativeElement: {
            getBoundingClientRect: () => ({
              left: 100,
              bottom: 80,
            }),
          },
        },
        filter: FilterName.DeviceInfo,
        title: FilterTitle.DeviceInfo,
      };

      component.ngOnInit();

      expect(updatePositionSpy).toHaveBeenCalledWith({
        left: '100px',
        top: '94px',
      });
    });

    it('should update dialog view on window resize', () => {
      const updatePositionSpy = spyOn(component.dialogRef, 'updatePosition');
      component.onResize();
      expect(updatePositionSpy).toHaveBeenCalled();
    });
  });

  describe('when opened from the filter menu of the Reports page', () => {
    /** Filters in the order of `SearchComponent.filterMenuItems`. */
    const MENU_ORDER: FilterName[] = [
      FilterName.Started,
      FilterName.DeviceInfo,
      FilterName.DeviceFirmware,
      FilterName.AssessmentType,
      FilterName.Results,
      FilterName.Location,
      FilterName.LinuxEnv,
      FilterName.PythonVersion,
      FilterName.Kernel,
    ];
    /**
     * The filter menu at 200% zoom, as reported: 48px items from y = 40, e.g.
     * "Result" at y = 232 and "Kernel" at y = 424.
     */
    const MENU_RECT = new DOMRect(112, 32, 280, 448);

    afterEach(() => {
      TestBed.inject(MatDialog).closeAll();
      const frame = window.frameElement as HTMLElement | null;
      frame?.style.removeProperty('width');
      frame?.style.removeProperty('height');
    });

    /**
     * Emulates a viewport of `width` × `height` CSS px, e.g. 640×480 for a
     * 1280×960 window at 200% zoom, by resizing the frame the specs run in, so
     * that `vh`, media queries and the overlay match it as at that zoom.
     */
    function setViewport(width: number, height: number): void {
      const frame = window.frameElement as HTMLElement | null;
      if (!frame) {
        pending('Needs the Karma context frame to resize the viewport');
        return;
      }
      frame.style.width = `${width}px`;
      frame.style.height = `${height}px`;

      expect([window.innerWidth, window.innerHeight])
        .withContext('emulated viewport')
        .toEqual([width, height]);
    }

    /** Top of the menu item of `filter` in the menu at 200% zoom. */
    function itemTopOf(filter: FilterName): number {
      return 40 + 48 * MENU_ORDER.indexOf(filter);
    }

    /**
     * Opens the dialog of `filter` from its menu item, as `ReportsComponent`
     * does, and returns its `mat-dialog-container`.
     */
    function openFromMenuItem(
      filter: FilterName,
      title: FilterTitle,
      itemTop = itemTopOf(filter)
    ): HTMLElement {
      TestBed.inject(MatDialog).open(FilterDialogComponent, {
        ariaLabel: 'Filters',
        data: {
          filter,
          title,
          trigger: new ElementRef(document.body),
          menuRect: MENU_RECT,
          itemRect: new DOMRect(MENU_RECT.left, itemTop, MENU_RECT.width, 48),
        },
        autoFocus: true,
        hasBackdrop: true,
        disableClose: true,
        maxHeight: '100vh',
        panelClass: 'filter-form-dialog',
      });
      TestBed.inject(ApplicationRef).tick();
      return document.querySelector('mat-dialog-container') as HTMLElement;
    }

    function contentOf(dialog: HTMLElement): HTMLElement {
      return dialog.querySelector('.filter-dialog-content') as HTMLElement;
    }

    function expectInViewport(element: Element | null, name: string): void {
      expect(element).withContext(name).not.toBeNull();
      const { top, right, bottom, left } = (
        element as Element
      ).getBoundingClientRect();
      const viewport = `${window.innerWidth}×${window.innerHeight} viewport`;

      expect(top)
        .withContext(`${name}: top in the ${viewport}`)
        .toBeGreaterThanOrEqual(0);
      expect(left)
        .withContext(`${name}: left in the ${viewport}`)
        .toBeGreaterThanOrEqual(0);
      expect(bottom)
        .withContext(`${name}: bottom in the ${viewport}`)
        .toBeLessThanOrEqual(window.innerHeight);
      expect(right)
        .withContext(`${name}: right in the ${viewport}`)
        .toBeLessThanOrEqual(window.innerWidth);
    }

    /** Checks that the content shows all of its controls, without scrolling. */
    function expectWholeContentShown(dialog: HTMLElement): void {
      const { clientHeight, scrollHeight } = contentOf(dialog);

      expect(scrollHeight)
        .withContext(
          `content of ${clientHeight}px hides part of its ${scrollHeight}px`
        )
        .toBeLessThanOrEqual(clientHeight);
    }

    /** Checks that the dialog stays beside its menu item, at its level. */
    function expectBesideMenuItem(dialog: HTMLElement, itemTop: number): void {
      const { top, bottom } = dialog.getBoundingClientRect();

      expect(top)
        .withContext('dialog top at or above its menu item')
        .toBeLessThanOrEqual(itemTop);
      expect(bottom)
        .withContext('dialog bottom below the top of its menu item')
        .toBeGreaterThan(itemTop);
    }

    describe('at 200% zoom (640×480 viewport)', () => {
      beforeEach(() => setViewport(640, 480));

      for (const [filter, title] of [
        [FilterName.Location, FilterTitle.Location],
        [FilterName.LinuxEnv, FilterTitle.LinuxEnv],
        [FilterName.PythonVersion, FilterTitle.PythonVersion],
        [FilterName.Kernel, FilterTitle.Kernel],
      ] as const) {
        it(`should show the whole "${title}" dialog inside the viewport`, () => {
          const dialog = openFromMenuItem(filter, title);

          expectInViewport(dialog, 'dialog');
          expectWholeContentShown(dialog);
          expectInViewport(dialog.querySelector('input'), 'input');
          expectInViewport(dialog.querySelector('.cancel-button'), 'Cancel');
          expectInViewport(dialog.querySelector('.confirm-button'), 'Ok');
          expectBesideMenuItem(dialog, itemTopOf(filter));
        });
      }

      it('should show all four "Select status" options inside the viewport', () => {
        const dialog = openFromMenuItem(
          FilterName.Results,
          FilterTitle.Results
        );
        const options = Array.from(dialog.querySelectorAll('mat-checkbox'));

        expectInViewport(dialog, 'dialog');
        expectWholeContentShown(dialog);
        expect(options.length).toBe(4);
        for (const option of options) {
          expectInViewport(option, option.textContent?.trim() ?? 'option');
        }
        expectBesideMenuItem(dialog, itemTopOf(FilterName.Results));
      });

      it('should fit the taller "Select dates" dialog in the viewport and scroll only its content', () => {
        const dialog = openFromMenuItem(
          FilterName.Started,
          FilterTitle.Started
        );
        const content = contentOf(dialog);

        expectInViewport(dialog, 'dialog');
        expectInViewport(dialog.querySelector('.cancel-button'), 'Cancel');
        expectInViewport(dialog.querySelector('.confirm-button'), 'Ok');
        expect(getComputedStyle(content).overflowY).toBe('auto');
        expect(content.scrollHeight)
          .withContext('calendar taller than the visible content')
          .toBeGreaterThan(content.clientHeight);
      });

      it('should keep a dialog that fits below its menu item level with the item', () => {
        const dialog = openFromMenuItem(
          FilterName.DeviceInfo,
          FilterTitle.DeviceInfo
        );

        expectInViewport(dialog, 'dialog');
        expectWholeContentShown(dialog);
        expect(dialog.getBoundingClientRect().top).toBe(
          itemTopOf(FilterName.DeviceInfo)
        );
      });
    });

    it('should move the dialog back inside the viewport when zooming in to 200% while it is open', () => {
      setViewport(1280, 960);
      const dialog = openFromMenuItem(FilterName.Kernel, FilterTitle.Kernel);
      expect(dialog.getBoundingClientRect().top)
        .withContext('level with its menu item at 100% zoom')
        .toBe(itemTopOf(FilterName.Kernel));

      setViewport(640, 480);
      window.dispatchEvent(new Event('resize'));
      TestBed.inject(ApplicationRef).tick();

      expectInViewport(dialog, 'dialog');
      expectWholeContentShown(dialog);
    });

    it('should never shrink the field on a very short viewport (320×180, 400% zoom)', () => {
      setViewport(320, 180);
      const dialog = openFromMenuItem(
        FilterName.Kernel,
        FilterTitle.Kernel,
        132
      );
      const surface = dialog.querySelector(
        '.mat-mdc-dialog-surface'
      ) as HTMLElement;

      expectInViewport(dialog, 'dialog');
      expectWholeContentShown(dialog);
      expect(surface.scrollHeight)
        .withContext('the dialog scrolls to its buttons')
        .toBeGreaterThan(surface.clientHeight);
    });
  });
});
