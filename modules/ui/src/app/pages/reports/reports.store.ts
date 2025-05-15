import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { MatRow, MatTableDataSource } from '@angular/material/table';
import {
  HistoryTestrun,
  StatusOfTestrun,
  TestrunStatus,
} from '../../model/testrun-status';
import { DateRange, Filters } from '../../model/filters';
import { TestRunService } from '../../services/test-run.service';
import { exhaustMap } from 'rxjs';
import { tap, withLatestFrom } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { MatSort } from '@angular/material/sort';
import { selectReports, selectRiskProfiles } from '../../store/selectors';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/state';
import { fetchReports, setReports } from '../../store/actions';
import { TestingType } from '../../model/device';

export interface ReportsComponentState {
  displayedColumns: string[];
  chips: string[];
  dataSource: MatTableDataSource<HistoryTestrun>;
  filterOpened: boolean;
  activeFilter: string;
  filteredValues: Filters;
  dataLoaded: boolean;
  selectedRow: MatRow | null;
  isFiltersEmpty: boolean;
  history: TestrunStatus[];
}

export const DATA_SOURCE_INITIAL_VALUE = new MatTableDataSource<HistoryTestrun>(
  []
);
@Injectable()
export class ReportsStore extends ComponentStore<ReportsComponentState> {
  private store = inject<Store<AppState>>(Store);
  private testRunService = inject(TestRunService);
  private datePipe = inject(DatePipe);

  private displayedColumns$ = this.select(state => state.displayedColumns);
  private chips$ = this.select(state => state.chips);
  private dataSource$ = this.select(state => state.dataSource);
  private filterOpened$ = this.select(state => state.filterOpened);
  private activeFilter$ = this.select(state => state.activeFilter);
  private filteredValues$ = this.select(state => state.filteredValues);
  private dataLoaded$ = this.select(state => state.dataLoaded);
  private selectedRow$ = this.select(state => state.selectedRow);
  private isFiltersEmpty$ = this.select(state => state.isFiltersEmpty);
  private history$ = this.store.select(selectReports);
  private profiles$ = this.store.select(selectRiskProfiles);
  viewModel$ = this.select({
    displayedColumns: this.displayedColumns$,
    chips: this.chips$,
    dataSource: this.dataSource$,
    filterOpened: this.filterOpened$,
    activeFilter: this.activeFilter$,
    filteredValues: this.filteredValues$,
    dataLoaded: this.dataLoaded$,
    selectedRow: this.selectedRow$,
    isFiltersEmpty: this.isFiltersEmpty$,
    profiles: this.profiles$,
  });

  setDataSource = this.updater((state, reports: TestrunStatus[]) => {
    const data = this.formateData(reports);
    const dataSource = new MatTableDataSource(data);

    dataSource.sortingDataAccessor = (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: any,
      sortHeaderId: string
    ): string => {
      const value = data[sortHeaderId];
      return typeof value === 'string' ? value.toLocaleLowerCase() : value;
    };
    dataSource.filterPredicate = this.customFilterPredicate();
    dataSource.filter = JSON.stringify(state.filteredValues);
    dataSource.sort = state.dataSource.sort;

    return {
      ...state,
      dataSource,
      dataLoaded: true,
    };
  });

  setIsFiltersEmpty = this.updater((state, isFiltersEmpty: boolean) => {
    return {
      ...state,
      isFiltersEmpty,
    };
  });

  setSelectedRow = this.updater((state, selectedRow: MatRow) => {
    return {
      ...state,
      selectedRow,
    };
  });
  setFilterOpened = this.updater((state, filterOpened: boolean) => {
    return {
      ...state,
      filterOpened,
    };
  });

  setActiveFiler = this.updater((state, activeFilter: string) => {
    return {
      ...state,
      activeFilter,
    };
  });

  updateFilteredValues = this.updater((state, filteredValues: Filters) => {
    return {
      ...state,
      filteredValues,
    };
  });

  deleteReport = this.effect<{
    mac_addr: string | null;
    deviceMacAddr: string;
    started: string | null;
  }>(trigger$ => {
    return trigger$.pipe(
      exhaustMap(({ mac_addr, deviceMacAddr, started }) => {
        return this.testRunService
          .deleteReport(mac_addr || deviceMacAddr, started || '')
          .pipe(
            withLatestFrom(this.history$),
            tap(([remove, current]) => {
              if (remove) {
                this.removeReport(mac_addr, deviceMacAddr, started, current);
              }
            })
          );
      })
    );
  });

  updateSort = this.effect<MatSort>(sort$ => {
    return sort$.pipe(
      withLatestFrom(this.dataSource$),
      tap(([sort, dataSource]) => {
        dataSource.sort = sort;
      })
    );
  });

  setFilteredValuesResults = this.effect<string[]>(results$ => {
    return results$.pipe(
      withLatestFrom(this.filteredValues$, this.dataSource$),
      tap(([results, filteredValues, dataSource]) => {
        this.updateFilters(dataSource, {
          ...filteredValues,
          results,
        });
      })
    );
  });

  setFilteredValuesDeviceInfo = this.effect<string>(deviceInfo$ => {
    return deviceInfo$.pipe(
      withLatestFrom(this.filteredValues$, this.dataSource$),
      tap(([deviceInfo, filteredValues, dataSource]) => {
        this.updateFilters(dataSource, {
          ...filteredValues,
          deviceInfo,
        });
      })
    );
  });

  setFilteredValuesDeviceFirmware = this.effect<string>(deviceFirmware$ => {
    return deviceFirmware$.pipe(
      withLatestFrom(this.filteredValues$, this.dataSource$),
      tap(([deviceFirmware, filteredValues, dataSource]) => {
        this.updateFilters(dataSource, {
          ...filteredValues,
          deviceFirmware,
        });
      })
    );
  });

  setFilteredValuesDateRange = this.effect<DateRange | string>(dateRange$ => {
    return dateRange$.pipe(
      withLatestFrom(this.filteredValues$, this.dataSource$),
      tap(([dateRange, filteredValues, dataSource]) => {
        this.updateFilters(dataSource, {
          ...filteredValues,
          dateRange,
        });
      })
    );
  });

  setFilteredValues = this.effect<Filters>(filteredValues$ => {
    return filteredValues$.pipe(
      withLatestFrom(this.dataSource$),
      tap(([filteredValues, dataSource]) => {
        this.updateFilters(dataSource, filteredValues);
      })
    );
  });

  getHistory = this.effect(() => {
    return this.history$.pipe(
      withLatestFrom(this.filteredValues$),
      tap(([reports, filteredValues]) => {
        this.setDataSource([...reports]);
        this?.setFilteredValues(filteredValues);
      })
    );
  });

  getReports = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.store.dispatch(fetchReports());
      })
    );
  });

  private removeReport(
    mac_addr: string | null,
    deviceMacAddr: string,
    started: string | null,
    current: TestrunStatus[]
  ) {
    const history = [...current];
    const idx = history.findIndex(
      report =>
        report.mac_addr === mac_addr &&
        report.device.mac_addr === deviceMacAddr &&
        report.started === started
    );
    if (typeof idx === 'number') {
      history.splice(idx, 1);
      this.store.dispatch(setReports({ reports: history }));
    }
  }

  private updateFilters(
    dataSource: MatTableDataSource<HistoryTestrun>,
    filteredValues: Filters
  ) {
    this.updateFilteredValues(filteredValues);
    dataSource.filter = JSON.stringify(filteredValues);

    this.setIsFiltersEmpty(this.isFiltersEmpty(filteredValues));
  }

  private formateData(data: TestrunStatus[]): HistoryTestrun[] {
    return data.map(item => {
      return {
        ...item,
        deviceFirmware: item.device.firmware,
        deviceInfo: item.device.manufacturer + ' ' + item.device.model,
        testResult: this.getTestResult(item),
        duration: this.getDuration(item.started, item.finished),
        program: item.device.test_pack ?? '',
      };
    });
  }

  private getTestResult(item: TestrunStatus): string {
    let result = '';
    if (item.device.test_pack === TestingType.Qualification) {
      if (
        item.status &&
        item.status === StatusOfTestrun.Complete &&
        item.result
      ) {
        result = item.result;
      } else {
        result = item.status;
      }
    }
    if (item.device.test_pack === TestingType.Pilot) {
      result = item.status;
    }
    return result;
  }

  private getDuration(started: string | null, finished: string | null): string {
    if (!started || !finished) {
      return '';
    }
    const startedDate = new Date(started);
    const finishedDate = new Date(finished);

    const durationMillisecond = finishedDate.getTime() - startedDate.getTime();
    const durationMinutes = this.transformDate(durationMillisecond, 'mm');
    const durationSeconds = this.transformDate(durationMillisecond, 'ss');

    return `${durationMinutes}m ${durationSeconds}s`;
  }

  private transformDate(date: number, format: string) {
    return this.datePipe.transform(date, format);
  }

  private customFilterPredicate() {
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
        searchString.results?.includes(data.testResult);
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

  private isFiltersEmpty(filteredValues: Filters) {
    return Object.values(filteredValues).every(value => {
      if (value.start === '') {
        return value.end.length === 0;
      }
      return value.length === 0;
    });
  }
  constructor() {
    super({
      displayedColumns: [
        'started',
        'duration',
        'deviceInfo',
        'deviceFirmware',
        'program',
        'status',
        'report',
      ],
      chips: ['chips'],
      dataSource: DATA_SOURCE_INITIAL_VALUE,
      filterOpened: false,
      activeFilter: '',
      filteredValues: {
        deviceInfo: '',
        deviceFirmware: '',
        results: [],
        dateRange: '',
      },
      dataLoaded: false,
      selectedRow: null,
      isFiltersEmpty: true,
      history: [],
    });
  }
}
