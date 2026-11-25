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
import { ResultOfTestrun } from '../../../../model/testrun-status';
import { TestingType } from '../../../../model/device';
import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';

/** Text filters and the visible label of their input. */
const TEXT_FILTERS = [
  {
    filter: FilterName.DeviceInfo,
    title: FilterTitle.DeviceInfo,
    label: 'Device',
  },
  {
    filter: FilterName.DeviceFirmware,
    title: FilterTitle.DeviceFirmware,
    label: 'Firmware',
  },
  {
    filter: FilterName.Location,
    title: FilterTitle.Location,
    label: 'Location',
  },
  {
    filter: FilterName.LinuxEnv,
    title: FilterTitle.LinuxEnv,
    label: 'Linux Environment',
  },
  {
    filter: FilterName.PythonVersion,
    title: FilterTitle.PythonVersion,
    label: 'Python Version',
  },
  { filter: FilterName.Kernel, title: FilterTitle.Kernel, label: 'Kernel' },
];

/** Text filters that validate their input, with values that fail and pass. */
const VALIDATED_TEXT_FILTERS = [
  {
    filter: FilterName.DeviceInfo,
    title: FilterTitle.DeviceInfo,
    label: 'Device',
    invalidValue: 'Invalid<>Device!',
    validValue: 'Smart Bulb 2',
    error: 'The device model name must be a maximum of 64 characters.',
  },
  {
    filter: FilterName.DeviceFirmware,
    title: FilterTitle.DeviceFirmware,
    label: 'Firmware',
    invalidValue: 'Invalid<>Firmware!',
    validValue: '1.0.2-beta',
    error: 'The firmware name must be a maximum of 64 characters.',
  },
];

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

  describe('text filter inputs (WCAG 1.3.1, 2.5.3, 4.1.2)', () => {
    for (const { filter, title, label } of TEXT_FILTERS) {
      it(`should name the "${label}" input by its visible label`, () => {
        component.data = { trigger: mockClientRest, filter, title };
        fixture.detectChanges();
        const input = compiled.querySelector(
          '.text-field-input'
        ) as HTMLInputElement;
        const matLabel = compiled.querySelector('mat-label') as HTMLElement;

        expect(visibleLabel(matLabel)).toBe(label);
        expect(accessibleName(input)).toBe(label);
        expect(input.hasAttribute('aria-label'))
          .withContext('an aria-label overrides the visible label')
          .toBeFalse();
      });
    }

    for (const {
      filter,
      title,
      label,
      invalidValue,
      error,
    } of VALIDATED_TEXT_FILTERS) {
      it(`should keep the invalid "${label}" input named by its label and described by its error`, async () => {
        component.data = { trigger: mockClientRest, filter, title };
        fixture.detectChanges();
        const input = compiled.querySelector(
          '.text-field-input'
        ) as HTMLInputElement;

        enterValue(input, invalidValue);
        await fixture.whenStable();
        fixture.detectChanges(); // Material syncs aria-describedby after content is checked

        expect(accessibleName(input)).toBe(label);
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(
          normalizeWhitespace(
            textOfIdRefs(input.getAttribute('aria-describedby'))
          )
        ).toContain(error);
      });
    }
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

    describe('accessible name (WCAG 1.3.1, 4.1.2)', () => {
      let select: HTMLElement;

      beforeEach(async () => {
        // MatSelect applies its initial value after a microtask.
        await fixture.whenStable();
        fixture.detectChanges();
        select = compiled.querySelector('mat-select') as HTMLElement;
      });

      function getSelectHarness(): Promise<MatSelectHarness> {
        return TestbedHarnessEnvironment.loader(fixture).getHarness(
          MatSelectHarness
        );
      }

      it('should be labelled by its visible label, then by the type it shows', () => {
        const [labelId, ...valueIds] = idRefsOf(select, 'aria-labelledby');
        const label = labelId ? document.getElementById(labelId) : null;
        const shownValue = select.querySelector('.mat-mdc-select-value');

        expect(label ? visibleLabel(label) : null)
          .withContext('first reference: the visible label')
          .toBe('Assessment type');
        expect(valueIds)
          .withContext('then only the shown value')
          .toEqual([shownValue?.id as string]);
        expect(select.hasAttribute('aria-label'))
          .withContext('aria-label would override aria-labelledby')
          .toBeFalse();
      });

      it('should be named by its label alone while no type is selected', () => {
        expect(accessibleName(select)).toBe('Assessment type');
      });

      for (const type of [TestingType.Qualification, TestingType.Pilot]) {
        it(`should announce "${type}" once it is selected`, async () => {
          const matSelect = await getSelectHarness();

          await matSelect.clickOptions({ text: type });

          expect(accessibleName(select)).toBe(`Assessment type ${type}`);
        });
      }

      it('should follow the type selected with the arrow keys', async () => {
        const matSelect = await getSelectHarness();
        const trigger = await matSelect.host();

        await trigger.sendKeys(TestKey.DOWN_ARROW);

        expect(accessibleName(select)).toBe('Assessment type Pilot Assessment');

        await trigger.sendKeys(TestKey.DOWN_ARROW);

        expect(accessibleName(select)).toBe(
          'Assessment type Device Qualification'
        );
        expect(await matSelect.isOpen())
          .withContext('the closed select changes its value in place')
          .toBeFalse();
      });
    });
  });

  describe('"Ok" button with invalid input (WCAG 3.3.1, 4.1.2)', () => {
    /** Queried on demand, so assertions never hold a stale element. */
    const okButton = () =>
      compiled.querySelector('.confirm-button') as HTMLButtonElement;

    for (const {
      filter,
      title,
      label,
      invalidValue,
      validValue,
    } of VALIDATED_TEXT_FILTERS) {
      describe(`in the "${label}" filter`, () => {
        let input: HTMLInputElement;

        beforeEach(() => {
          component.data = { trigger: mockClientRest, filter, title };
          fixture.detectChanges();
          input = compiled.querySelector(
            '.text-field-input'
          ) as HTMLInputElement;
        });

        it('should be disabled, and keep the dialog open, while the value is invalid', () => {
          const closeSpy = spyOn(component.dialogRef, 'close');

          enterValue(input, invalidValue);

          expect(okButton().disabled).toBeTrue();
          okButton().click();
          component.confirm(); // the guard holds even if "Ok" is reached another way
          expect(closeSpy).not.toHaveBeenCalled();
        });

        it('should be enabled again once the value is corrected or cleared', () => {
          enterValue(input, invalidValue);
          expect(okButton().disabled).toBeTrue();

          enterValue(input, validValue);
          expect(okButton().disabled).withContext('a valid value').toBeFalse();

          enterValue(input, invalidValue);
          enterValue(input, '');
          expect(okButton().disabled)
            .withContext('an empty value clears the filter')
            .toBeFalse();
        });
      });
    }

    describe('in the "Started" filter', () => {
      beforeEach(() => {
        component.data = {
          trigger: mockClientRest,
          filter: FilterName.Started,
          title: FilterTitle.Started,
        };
        fixture.detectChanges();
      });

      for (const { part, selector } of [
        { part: 'start', selector: 'input[matStartDate]' },
        { part: 'end', selector: 'input[matEndDate]' },
      ]) {
        it(`should be disabled while the ${part} date is not in mm/dd/yyyy format`, () => {
          const dateInput = compiled.querySelector(
            selector
          ) as HTMLInputElement;

          enterValue(dateInput, 'not a date');
          expect(okButton().disabled).toBeTrue();

          enterValue(dateInput, '01/15/2024');
          expect(okButton().disabled).withContext('a valid date').toBeFalse();
        });
      }
    });
  });

  /** Types a value into the field and leaves it, as a user does. */
  function enterValue(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }

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
});

/** Collapses whitespace the way the accessible name computation does. */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Text of a subtree as assistive technology reads it: skips `aria-hidden` and
 * CSS-hidden nodes. With `visibleOnly`, it also skips visually hidden text
 * (clipped to 1 x 1 px), so it returns only what sighted users read.
 */
function textOf(node: Node, visibleOnly = false): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (
    !(node instanceof HTMLElement) ||
    node.getAttribute('aria-hidden') === 'true'
  ) {
    return '';
  }
  const { display, visibility } = getComputedStyle(node);
  const { width, height } = node.getBoundingClientRect();
  if (
    display === 'none' ||
    visibility === 'hidden' ||
    (visibleOnly && width <= 1 && height <= 1)
  ) {
    return '';
  }
  return Array.from(node.childNodes, child => textOf(child, visibleOnly)).join(
    ''
  );
}

/** IDs referenced by an ID reference list attribute, e.g. `aria-labelledby`. */
function idRefsOf(element: Element, attribute: string): string[] {
  return (element.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean);
}

/** Text of the elements referenced by an `aria-labelledby`/`aria-describedby` value. */
function textOfIdRefs(idRefs: string | null): string {
  return (idRefs ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
    .join(' ');
}

/**
 * Accessible name of a form control, in the order the accessible name
 * computation applies: `aria-labelledby`, `aria-label`, then its `<label>`s.
 */
function accessibleName(element: HTMLElement): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    return normalizeWhitespace(textOfIdRefs(labelledBy));
  }
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel?.trim()) {
    return normalizeWhitespace(ariaLabel);
  }
  const labels = element instanceof HTMLInputElement ? element.labels : null;
  return normalizeWhitespace(
    Array.from(labels ?? [], label => textOf(label)).join(' ')
  );
}

/** Text label that sighted users see on a control. */
function visibleLabel(element: HTMLElement): string {
  return normalizeWhitespace(textOf(element, true));
}
