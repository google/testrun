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
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  signal,
  viewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogConfig,
  MatDialogContent,
  MatDialogModule,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormGroupDirective,
  FormsModule,
  NgForm,
  NgModel,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  DateRange,
  DefaultMatCalendarRangeStrategy,
  MAT_DATE_RANGE_SELECTION_STRATEGY,
  MatCalendar,
  MatDatepickerInputEvent,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { ErrorStateMatcher, MatNativeDateModule } from '@angular/material/core';
import {
  FilterName,
  DateRange as LocalDateRange,
} from '../../../../model/filters';
import { EscapableDialogComponent } from '../../../../components/escapable-dialog/escapable-dialog.component';
import {
  ResultOfTestrun,
  StatusOfTestrun,
} from '../../../../model/testrun-status';
import { TestingType } from '../../../../model/device';
import { DeviceValidators } from '../../../devices/components/device-form/device.validators';

class DateErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: FormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    const isSubmitted = form && form.submitted;
    return !!(
      control &&
      control.errors &&
      control.errors['matDatepickerParse'].text.trim().length > 0 &&
      control.invalid &&
      (control.touched || isSubmitted)
    );
  }
}

interface DialogData {
  trigger: ElementRef;
  filter: string;
  title: string;
  menuRect?: DOMRect;
  itemRect?: DOMRect;
}

/** Size of the dialog rendered in the overlay, in px. */
interface DialogSize {
  width: number;
  /** Height of the title and the actions, which do not scroll. */
  fixedHeight: number;
  /** Height of the whole content, including the part it scrolls to. */
  contentHeight: number;
}

/** Space kept between the dialog and the bottom of the viewport, in px. */
const VIEWPORT_GAP = 16;

/**
 * Lowest max height of the content, in px: room for an outlined form field and
 * the padding of the content, so that a short viewport never crushes it.
 */
const MIN_CONTENT_HEIGHT = 88;

@Component({
  selector: 'app-filter-dialog',

  imports: [
    CommonModule,
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
  templateUrl: './filter-dialog.component.html',
  styleUrls: ['./filter-dialog.component.scss'],
  providers: [
    {
      provide: MAT_DATE_RANGE_SELECTION_STRATEGY,
      useClass: DefaultMatCalendarRangeStrategy,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterDialogComponent
  extends EscapableDialogComponent
  implements OnInit, AfterViewInit
{
  override dialogRef: MatDialogRef<FilterDialogComponent>;
  private deviceValidators = inject(DeviceValidators);
  data = inject<DialogData>(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);

  resultList = [
    { value: ResultOfTestrun.Compliant, enabled: false },
    { value: ResultOfTestrun.NonCompliant, enabled: false },
    { value: StatusOfTestrun.Proceed, enabled: false },
    { value: StatusOfTestrun.DoNotProceed, enabled: false },
  ];
  filterForm!: FormGroup;
  selectedRangeValue!: DateRange<Date> | undefined;

  public readonly FilterName = FilterName;

  public readonly testingTypes: TestingType[] = [
    TestingType.Pilot,
    TestingType.Qualification,
  ];

  range: LocalDateRange = new LocalDateRange();

  /**
   * Max height of the content, in px, that keeps the dialog in the viewport;
   * `null` until the dialog is rendered.
   */
  readonly contentMaxHeight = signal<number | null>(null);

  today = new Date();

  @HostListener('window:resize')
  onResize() {
    this.setDialogView();
  }

  readonly calendar = viewChild(MatCalendar);
  readonly startDate = viewChild<NgModel>('startDate');
  readonly endDate = viewChild<NgModel>('endDate');
  private readonly title = viewChild(MatDialogTitle, { read: ElementRef });
  private readonly content = viewChild(MatDialogContent, { read: ElementRef });
  private readonly actions = viewChild(MatDialogActions, { read: ElementRef });

  constructor() {
    const dialogRef = inject<MatDialogRef<FilterDialogComponent>>(MatDialogRef);

    super();
    this.dialogRef = dialogRef;
  }

  get deviceInfo() {
    return this.filterForm.get('deviceInfo') as AbstractControl;
  }

  get deviceFirmware() {
    return this.filterForm.get('deviceFirmware') as AbstractControl;
  }

  get location() {
    return this.filterForm.get('location') as AbstractControl;
  }

  get linuxEnv() {
    return this.filterForm.get('linuxEnv') as AbstractControl;
  }

  get pythonVersion() {
    return this.filterForm.get('pythonVersion') as AbstractControl;
  }

  get kernel() {
    return this.filterForm.get('kernel') as AbstractControl;
  }

  get assessmentType() {
    return this.filterForm.get('assessmentType') as AbstractControl;
  }

  ngOnInit() {
    this.setDialogView();
    this.createFilterForm();
  }

  ngAfterViewInit() {
    // Fits the dialog in the viewport, now that the size of its content is known.
    this.setDialogView();
  }

  private setDialogView(): void {
    const matDialogConfig: MatDialogConfig = new MatDialogConfig();

    if (this.data.filter === FilterName.Started) {
      matDialogConfig.width = '360px';
    } else if (this.data.filter === FilterName.Results) {
      matDialogConfig.width = '240px';
    } else {
      matDialogConfig.width = '328px';
    }

    const size = this.getDialogSize();
    // The rendered width can be larger, e.g. the 280px min width of Material
    // dialogs for "Select status".
    const dialogWidthNum = Math.max(
      parseInt(matDialogConfig.width, 10) || 328,
      size?.width ?? 0
    );

    if (this.data.menuRect) {
      let left = this.data.menuRect.right;
      if (left + dialogWidthNum > window.innerWidth) {
        left = Math.max(0, window.innerWidth - dialogWidthNum);
      }
      const top = this.fitInViewport(
        this.data.itemRect ? this.data.itemRect.top : this.data.menuRect.top,
        size
      );

      matDialogConfig.position = {
        left: `${left}px`,
        top: `${top}px`,
      };
    } else {
      const rect = this.data.trigger?.nativeElement?.getBoundingClientRect?.();
      if (rect) {
        matDialogConfig.position = {
          left:
            this.data.filter === FilterName.Results
              ? `${rect.left - 240}px`
              : `${rect.left}px`,
          top: `${this.fitInViewport(rect.bottom + 14, size)}px`,
        };
      }
    }

    this.dialogRef.updateSize(matDialogConfig.width);
    if (matDialogConfig.position) {
      this.dialogRef.updatePosition(matDialogConfig.position);
    }
  }

  /** Size of the dialog once it is rendered in the overlay, else `null`. */
  private getDialogSize(): DialogSize | null {
    const title: HTMLElement | undefined = this.title()?.nativeElement;
    const content: HTMLElement | undefined = this.content()?.nativeElement;
    const actions: HTMLElement | undefined = this.actions()?.nativeElement;
    const container = content?.closest<HTMLElement>('mat-dialog-container');
    if (!title || !content || !actions || !container) {
      return null;
    }
    return {
      width: container.offsetWidth,
      fixedHeight: title.offsetHeight + actions.offsetHeight,
      contentHeight: content.scrollHeight,
    };
  }

  /**
   * Returns the top of the dialog that keeps it in the viewport, also at 200%
   * zoom (WCAG 1.4.4, 1.4.10): `anchorTop` while the whole dialog fits below
   * it, otherwise just high enough to show the whole content, but never above
   * the viewport. Limits the content to the height left, where it scrolls, but
   * never below `MIN_CONTENT_HEIGHT`.
   */
  private fitInViewport(anchorTop: number, size: DialogSize | null): number {
    if (!size) {
      return anchorTop;
    }
    const bottom = window.innerHeight - VIEWPORT_GAP;
    const top = Math.max(
      0,
      Math.min(anchorTop, bottom - size.fixedHeight - size.contentHeight)
    );
    this.contentMaxHeight.set(
      Math.max(MIN_CONTENT_HEIGHT, bottom - top - size.fixedHeight)
    );
    return top;
  }

  private createFilterForm() {
    this.filterForm = this.fb.group({
      deviceInfo: ['', [this.deviceValidators.deviceStringFormat()]],
      deviceFirmware: ['', [this.deviceValidators.firmwareStringFormat()]],
      location: ['', []],
      linuxEnv: ['', []],
      pythonVersion: ['', []],
      kernel: ['', []],
      assessmentType: ['', []],
      results: new FormArray(this.resultList.map(() => new FormControl(false))),
    });
  }

  get results() {
    return this.filterForm.controls['results'] as FormArray;
  }

  selectedChange(date: Date): void {
    if (!this.selectedRangeValue?.start || this.selectedRangeValue?.end) {
      this.selectedRangeValue = new DateRange<Date>(date, null);
    } else {
      const start = this.selectedRangeValue.start;
      const end = date;
      if (end < start) {
        this.selectedRangeValue = new DateRange<Date>(end, start);
      } else {
        this.selectedRangeValue = new DateRange<Date>(start, end);
      }
    }

    this.range.start = this.selectedRangeValue.start;
    this.range.end = this.selectedRangeValue.end;
  }

  confirm(): void {
    if (
      this.filterForm?.invalid ||
      this.startDate()?.invalid ||
      this.endDate()?.invalid
    ) {
      return;
    }

    const formData = this.filterForm.value;
    const results = this.resultList
      .filter((item, i) => {
        return !!this.results.controls[i].value;
      })
      .map(item => item.value);

    if (
      this.range.start &&
      (this.range.end === null || this.range.end === '')
    ) {
      this.range.end = new Date();
    }

    const filtersData = {
      deviceInfo: formData.deviceInfo?.trim() || '',
      deviceFirmware: formData.deviceFirmware?.trim() || '',
      location: formData.location?.trim() || '',
      linuxEnv: formData.linuxEnv?.trim() || '',
      pythonVersion: formData.pythonVersion?.trim() || '',
      kernel: formData.kernel?.trim() || '',
      assessmentType: formData.assessmentType?.trim() || '',
      results,
      dateRange: this.range,
    };

    this.dialogRef.close(filtersData);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  dateMatcher = new DateErrorStateMatcher();

  startDateChanged(event: MatDatepickerInputEvent<Date>) {
    const date = event.value;
    if (date && date.getFullYear() > this.today.getFullYear()) {
      date.setFullYear(this.today.getFullYear());
      this.range.start = date;
    }
    this.selectedRangeValue = new DateRange<Date>(
      date,
      this.selectedRangeValue?.end || null
    );
    if (this.selectedRangeValue.start) {
      const calendar = this.calendar();
      if (calendar) {
        calendar.activeDate = this.selectedRangeValue.start;
        calendar.updateTodaysDate();
      }
    }
  }

  endDateChanged(event: MatDatepickerInputEvent<Date>) {
    const date = event.value;
    if (date && date.getFullYear() > this.today.getFullYear()) {
      date.setFullYear(this.today.getFullYear());
      this.range.end = date;
    }
    this.selectedRangeValue = new DateRange<Date>(
      this.selectedRangeValue?.start || null,
      event.value
    );
    if (this.selectedRangeValue?.end) {
      const calendar = this.calendar();
      if (calendar) {
        calendar.activeDate = this.selectedRangeValue.end;
        calendar.updateTodaysDate();
      }
    }
  }
}
