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
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestRunService } from '../../services/test-run.service';
import {
  StatusResultClassName,
  TestrunStatus,
} from '../../model/testrun-status';
import { DatePipe } from '@angular/common';
import { MatSort, Sort } from '@angular/material/sort';
import { Subject, takeUntil, timer } from 'rxjs';
import { MatRow } from '@angular/material/table';
import { FilterDialogComponent } from './components/filter-dialog/filter-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { tap } from 'rxjs/internal/operators/tap';
import { FilterName, Filters } from '../../model/filters';
import { ReportsStore } from './reports.store';

@Component({
  selector: 'app-history',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  providers: [ReportsStore],
})
export class ReportsComponent implements OnInit, OnDestroy {
  public readonly FilterName = FilterName;
  private destroy$: Subject<boolean> = new Subject<boolean>();
  @ViewChild(MatSort, { static: false }) sort!: MatSort;
  viewModel$ = this.store.viewModel$;
  constructor(
    private testRunService: TestRunService,
    private datePipe: DatePipe,
    private liveAnnouncer: LiveAnnouncer,
    public dialog: MatDialog,
    private store: ReportsStore
  ) {}

  ngOnInit() {
    this.store.getReports();
    this.store.updateSort(this.sort);
  }

  getFormattedDateString(date: string | null) {
    return date ? this.datePipe.transform(date, 'd MMM y H:mm') : '';
  }
  sortData(sortState: Sort) {
    this.store.updateSort(this.sort);
    if (sortState.direction) {
      this.liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this.liveAnnouncer.announce('Sorting cleared');
    }
  }

  public getResultClass(status: string): StatusResultClassName {
    return this.testRunService.getResultClass(status);
  }

  openFilter(event: Event, filter: string, filterOpened: boolean) {
    event.stopPropagation();
    const target = new ElementRef(event.currentTarget);

    if (!filterOpened) {
      this.openFilterDialog(target, filter);
    }
  }

  openFilterDialog(target: ElementRef<EventTarget | null>, filter: string) {
    this.store.setFilterOpened(true);
    this.store.setActiveFiler(filter);
    const dialogRef = this.dialog.open(FilterDialogComponent, {
      ariaLabel: 'Filters',
      data: {
        filter,
        trigger: target,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'filter-form-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(
        takeUntil(this.destroy$),
        tap(() => {
          this.store.setFilterOpened(false);
          this.store.setActiveFiler('');
        })
      )
      .subscribe(filteredData => {
        if (filteredData) {
          if (filter === FilterName.Results) {
            this.store.setFilteredValuesResults(filteredData.results);
          }
          if (filter === FilterName.DeviceInfo) {
            this.store.setFilteredValuesDeviceInfo(filteredData.deviceInfo);
          }
          if (filter === FilterName.DeviceFirmware) {
            this.store.setFilteredValuesDeviceFirmware(
              filteredData.deviceFirmware
            );
          }
          if (filter === FilterName.Started) {
            this.store.setFilteredValuesDateRange(filteredData.dateRange);
          }
        }
      });
  }

  filterCleared(filters: Filters) {
    this.store.setFilteredValues(filters);
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  selectRow(row: MatRow) {
    this.store.setSelectedRow(row);
  }

  trackByStarted(index: number, item: TestrunStatus) {
    return item.started;
  }

  focusNextButton() {
    // Try to focus next interactive element, if exists
    const next = window.document.querySelector(
      '.report-selected + tr a'
    ) as HTMLButtonElement;
    if (next) {
      timer(50).subscribe(() => {
        next.focus();
      });
    } else {
      // If next interactive element doest not exist, add menu reports button should be focused
      const menuButton = window.document.querySelector(
        '.app-sidebar-button-reports'
      ) as HTMLButtonElement;
      timer(50).subscribe(() => {
        menuButton?.focus();
      });
    }
  }

  removeDevice(data: TestrunStatus) {
    this.store.deleteReport({
      mac_addr: data.mac_addr,
      deviceMacAddr: data.device.mac_addr,
      started: data.started,
    });
    this.focusNextButton();
  }
}
