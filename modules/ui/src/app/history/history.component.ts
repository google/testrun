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
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestRunService } from '../services/test-run.service';
import {
  HistoryTestrun,
  StatusResultClassName,
  TestrunStatus,
} from '../model/testrun-status';
import { DatePipe } from '@angular/common';
import { MatSort, Sort } from '@angular/material/sort';
import { Subject, takeUntil } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { FilterDialogComponent } from '../components/filter-dialog/filter-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { tap } from 'rxjs/internal/operators/tap';
import { DateRange, FilterName, Filters } from '../model/filters';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns: string[] = [
    'started',
    'duration',
    'deviceInfo',
    'deviceFirmware',
    'status',
    'report',
  ];
  chips: string[] = ['chips'];
  dataSource: MatTableDataSource<HistoryTestrun> =
    new MatTableDataSource<HistoryTestrun>([]);

  public readonly FilterName = FilterName;
  public filterOpened = false;
  public activeFilter = '';
  public resultList = ['Compliant', 'Non-Compliant'];
  filteredValues: Filters = {
    deviceInfo: '',
    deviceFirmware: '',
    results: [],
    dateRange: '',
  };
  private destroy$: Subject<boolean> = new Subject<boolean>();
  @ViewChild(MatSort) sort!: MatSort;
  dataLoaded = false;
  constructor(
    private testRunService: TestRunService,
    private datePipe: DatePipe,
    private liveAnnouncer: LiveAnnouncer,
    public dialog: MatDialog
  ) {
    this.testRunService.fetchHistory();
  }

  ngOnInit() {
    this.testRunService
      .getHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (!res) {
          return;
        }
        const data = this.formateData(res);

        this.dataSource = new MatTableDataSource(data);

        this.dataSource.sortingDataAccessor = (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: any,
          sortHeaderId: string
        ): string => {
          const value = data[sortHeaderId];
          return typeof value === 'string' ? value.toLocaleLowerCase() : value;
        };
        this.dataSource.filterPredicate = this.customFilterPredicate();
        this.dataSource.filter = JSON.stringify(this.filteredValues);
        this.dataLoaded = true;
      });
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }

  customFilterPredicate() {
    const filterPredicate = (data: HistoryTestrun, filter: string): boolean => {
      const searchString = JSON.parse(filter);
      const isIncludeDeviceInfo = this.filterStringData(
        data.deviceInfo,
        searchString.deviceInfo
      );
      const isIncludeDeviceFirmware = this.filterStringData(
        data.deviceFirmware,
        searchString.deviceFirmware
      );

      const isIncludeStatus =
        searchString.results?.length === 0 ||
        searchString.results?.includes(data.status);
      const isIncludeStartedDate = this.filterStartedDateRange(
        data.started,
        searchString
      );

      return (
        isIncludeDeviceInfo &&
        isIncludeDeviceFirmware &&
        isIncludeStatus &&
        isIncludeStartedDate
      );
    };
    return filterPredicate;
  }

  private filterStringData(data: string, searchString: string): boolean {
    return (
      data
        .toString()
        .trim()
        .toLowerCase()
        .indexOf(searchString.trim().toLowerCase()) !== -1
    );
  }

  private filterStartedDateRange(
    startedDate: string | null,
    searchString: { dateRange: DateRange }
  ): boolean {
    let isIncludeDate = true;

    if (!searchString.dateRange || !startedDate) {
      return isIncludeDate;
    }

    const startDate = searchString.dateRange.start
      ? typeof searchString.dateRange.start === 'string'
        ? Date.parse(searchString.dateRange.start)
        : searchString.dateRange.start.getDate()
      : 0;
    const endDate = searchString.dateRange.end
      ? typeof searchString.dateRange.end === 'string'
        ? Date.parse(searchString.dateRange.end)
        : searchString.dateRange.end.getDate()
      : 0;

    const startedDateWithoutTime = new Date(startedDate).toDateString();
    const dateToFilter = Date.parse(startedDateWithoutTime);

    if (startDate && endDate && dateToFilter) {
      isIncludeDate = dateToFilter >= startDate && dateToFilter <= endDate;
    } else if (startDate && dateToFilter) {
      isIncludeDate = dateToFilter >= startDate;
    }

    return isIncludeDate;
  }

  private formateData(data: TestrunStatus[]): HistoryTestrun[] {
    return data.map(item => {
      return {
        ...item,
        deviceFirmware: item.device.firmware,
        deviceInfo: item.device.manufacturer + ' ' + item.device.model,
        duration: this.getDuration(item.started, item.finished),
      };
    });
  }

  getFormattedDateString(date: string | null) {
    return date ? this.datePipe.transform(date, 'd MMM y H:mm') : '';
  }

  sortData(sortState: Sort) {
    this.dataSource.sort = this.sort;
    if (sortState.direction) {
      this.liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this.liveAnnouncer.announce('Sorting cleared');
    }
  }

  private transformDate(date: number, format: string) {
    return this.datePipe.transform(date, format);
  }

  public getDuration(started: string | null, finished: string | null): string {
    if (!started || !finished) {
      return '';
    }
    const startedDate = new Date(started);
    const finishedDate = new Date(finished);

    const durationMillisecond = finishedDate.getTime() - startedDate.getTime();
    const durationMinuts = this.transformDate(durationMillisecond, 'mm');
    const durationSeconds = this.transformDate(durationMillisecond, 'ss');

    return `${durationMinuts}m ${durationSeconds}s`;
  }

  public getResultClass(status: string): StatusResultClassName {
    return this.testRunService.getResultClass(status);
  }

  openFilter(event: Event, filter: string) {
    event.stopPropagation();
    const target = new ElementRef(event.currentTarget);

    if (!this.filterOpened) {
      this.openFilterDialog(target, filter);
    }
  }

  openFilterDialog(target: ElementRef<EventTarget | null>, filter: string) {
    this.filterOpened = true;
    this.activeFilter = filter;
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
          this.filterOpened = false;
          this.activeFilter = '';
        })
      )
      .subscribe(filteredData => {
        if (filteredData) {
          if (filter === FilterName.Results) {
            this.filteredValues.results = filteredData.results;
          }
          if (filter === FilterName.DeviceInfo) {
            this.filteredValues.deviceInfo = filteredData.deviceInfo;
          }
          if (filter === FilterName.DeviceFirmware) {
            this.filteredValues.deviceFirmware = filteredData.deviceFirmware;
          }
          if (filter === FilterName.Started) {
            this.filteredValues.dateRange = filteredData.dateRange;
          }

          this.dataSource.filter = JSON.stringify(this.filteredValues);
        }
      });
  }

  filterCleared(filters: Filters) {
    this.filteredValues = filters;
    this.dataSource.filter = JSON.stringify(this.filteredValues);
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  isFiltersEmpty() {
    return Object.values(this.filteredValues).every(
      value => value.length === 0
    );
  }
}
