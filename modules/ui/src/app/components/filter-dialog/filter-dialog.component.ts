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
import {ChangeDetectionStrategy, Component, ElementRef, Inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MAT_DIALOG_DATA, MatDialogConfig, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {DateRange, DefaultMatCalendarRangeStrategy, MAT_DATE_RANGE_SELECTION_STRATEGY, MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule} from '@angular/material/core';
import {FilterName} from '../../model/filters';

interface DialogData {
  trigger: ElementRef;
  filter: string;
  availableStatuses: string[];
}

@Component({
  selector: 'app-filter-dialog',
  standalone: true,
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
    MatNativeDateModule
  ],
  templateUrl: './filter-dialog.component.html',
  styleUrls: ['./filter-dialog.component.scss'],
  providers: [
    {
      provide: MAT_DATE_RANGE_SELECTION_STRATEGY,
      useClass: DefaultMatCalendarRangeStrategy,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterDialogComponent implements OnInit {
  resultList = [
    {value: 'Compliant', disabled: false},
    {value: 'Non-Compliant', disabled: false},
    {value: 'Informational', disabled: false},
    {value: 'Error', disabled: false},
  ];
  filterForm!: FormGroup;
  selectedRangeValue!: DateRange<Date> | undefined;

  public readonly FilterName = FilterName;

  range: { start: Date | null | string; end: Date | null | string } = {
    start: null,
    end: null
  };

  constructor(
    public dialogRef: MatDialogRef<FilterDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private fb: FormBuilder,
  ) {
  }

  ngOnInit() {
    this.setDialogView();
    this.updateResultList();
    this.createFilterForm();
  }

  private setDialogView(): void {
    const matDialogConfig: MatDialogConfig = new MatDialogConfig();
    const rect = this.data.trigger?.nativeElement.getBoundingClientRect();

    matDialogConfig.position = {
      left: `${rect.left - 80}px`,
      top: `${rect.bottom + 0}px`
    };
    matDialogConfig.width = this.data.filter === 'results' ? '240px' : '328px';

    this.dialogRef.updateSize(matDialogConfig.width);
    this.dialogRef.updatePosition(matDialogConfig.position);
  }

  private updateResultList(): void {
    this.resultList.map((result) => {
      result.disabled = !this.data.availableStatuses.includes(result.value);
      return result;
    });
  }

  private createFilterForm() {
    this.filterForm = this.fb.group({
      deviceInfo: [''],
      deviceFirmware: [''],
      results: this.fb.array(this.resultList),
    });
  }

  selectedChange(date: any): void {
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
    const formData = this.filterForm.value;
    const results = formData.results.filter((item: string | boolean) => !!item);

    const filtersData = {
      ...formData,
      results,
      dateRange: this.range
    };

    this.dialogRef.close(filtersData);
  }

  cancel(): void {
    this.dialogRef.close();
  }

}
