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
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  viewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogConfig,
  MatDialogModule,
  MatDialogRef,
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
}

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
  implements OnInit
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

  range: LocalDateRange = new LocalDateRange();

  topPosition = 0;
  dialogTitle = 110;

  today = new Date();

  private dialog_actions_height = 50;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.setDialogView();
  }

  readonly calendar = viewChild(MatCalendar);
  readonly startDate = viewChild<NgModel>('startDate');
  readonly endDate = viewChild<NgModel>('endDate');

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

  ngOnInit() {
    this.setDialogView();
    this.createFilterForm();
  }

  private setDialogView(): void {
    const matDialogConfig: MatDialogConfig = new MatDialogConfig();
    const rect = this.data.trigger?.nativeElement.getBoundingClientRect();

    matDialogConfig.position = {
      left:
        this.data.filter === FilterName.Results
          ? `${rect.left - 240}px`
          : `${rect.left}px`,
      top: `${rect.bottom + 14}px`,
    };

    this.topPosition = rect.bottom + this.dialog_actions_height;
    if (this.data.filter === FilterName.Started) {
      matDialogConfig.width = '360px';
    } else if (this.data.filter === FilterName.Results) {
      matDialogConfig.width = '240px';
    } else {
      matDialogConfig.width = '328px';
    }

    this.dialogRef.updateSize(matDialogConfig.width);
    this.dialogRef.updatePosition(matDialogConfig.position);
  }
  private createFilterForm() {
    this.filterForm = this.fb.group({
      deviceInfo: ['', [this.deviceValidators.deviceStringFormat()]],
      deviceFirmware: ['', [this.deviceValidators.firmwareStringFormat()]],
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
      deviceInfo: formData.deviceInfo.trim(),
      deviceFirmware: formData.deviceFirmware.trim(),
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
