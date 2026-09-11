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
  DestroyRef,
  ElementRef,
  HostListener,
  Injector,
  OnDestroy,
  OnInit,
  afterNextRender,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
  PageEvent,
} from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TestRunService } from '../../services/test-run.service';
import {
  HistoryTestrun,
  StatusResultClassName,
  TestrunReport,
} from '../../model/testrun-status';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { Subject, takeUntil, timer } from 'rxjs';
import { MatRow, MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { tap } from 'rxjs/internal/operators/tap';
import {
  FilterName,
  FilterTitle,
  Filters,
  OpenFilterEvent,
} from '../../model/filters';
import { ReportsStore } from './reports.store';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { SearchComponent } from './components/search/search.component';
import { DownloadReportZipComponent } from '../../components/download-report-zip/download-report-zip.component';
import { DownloadReportPdfComponent } from '../../components/download-report-pdf/download-report-pdf.component';
import { DeleteReportComponent } from './components/delete-report/delete-report.component';
import { FilterDialogComponent } from './components/filter-dialog/filter-dialog.component';
import { EmptyMessageComponent } from '../../components/empty-message/empty-message.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { state, style, trigger } from '@angular/animations';
import { ReportsPaginatorIntl } from './reports-paginator-intl';

export const TABLE_ROW_HEIGHT = 52;
export const TABLE_OVERHEAD_HEIGHT = 112; // Header row (56px) + Paginator (56px)
export const PAGE_VERTICAL_OVERHEAD = 410; // Estimated vertical UI overhead outside table data rows
export const DEFAULT_PAGE_SIZE = 10;
export const MIN_PAGE_SIZE = 3;
export const MAX_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS: readonly number[] = [5, 10, 15, 20, 50];

export const SCREEN_SIZE_PAGE_SIZES = {
  XSmall: 3,
  Small: 6,
  Medium: 9,
  Large: 14,
  XLarge: 20,
} as const;

export interface CalculatePageSizeOptions {
  containerHeight?: number;
  windowHeight?: number;
  maxForBreakpoint?: number;
}

export function calculatePageSize(
  options: CalculatePageSizeOptions = {}
): number {
  const { containerHeight, windowHeight, maxForBreakpoint } = options;

  let availableHeight: number | undefined;
  if (containerHeight !== undefined && containerHeight > 0) {
    availableHeight = containerHeight - TABLE_OVERHEAD_HEIGHT;
  } else if (windowHeight !== undefined && windowHeight > 0) {
    availableHeight = windowHeight - PAGE_VERTICAL_OVERHEAD;
  }

  if (availableHeight === undefined) {
    return maxForBreakpoint ?? DEFAULT_PAGE_SIZE;
  }

  let count = Math.floor(availableHeight / TABLE_ROW_HEIGHT);

  if (maxForBreakpoint !== undefined && maxForBreakpoint > 0) {
    count = Math.min(count, maxForBreakpoint);
  }

  return Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, count));
}

@Component({
  selector: 'app-history',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatIconModule,
    MatToolbarModule,
    MatSortModule,
    MatButtonModule,
    MatInputModule,
    MatPaginatorModule,
    SearchComponent,
    DeleteReportComponent,
    DownloadReportZipComponent,
    DownloadReportPdfComponent,
    EmptyMessageComponent,
    MatTooltipModule,
  ],
  providers: [
    ReportsStore,
    DatePipe,
    { provide: MatPaginatorIntl, useClass: ReportsPaginatorIntl },
  ],
  animations: [
    trigger('detailExpand', [
      state(
        'collapsed,void',
        style({ height: '0px', minHeight: '0', display: 'none' })
      ),
      state('expanded', style({ height: '*' })),
    ]),
  ],
})
export class ReportsComponent implements OnInit, OnDestroy {
  EMPTY_DETAIL_TEXT = 'Could not fetch details';
  private testRunService = inject(TestRunService);
  private datePipe = inject(DatePipe);
  private liveAnnouncer = inject(LiveAnnouncer);
  private breakpointObserver = inject(BreakpointObserver);
  private destroyRef = inject(DestroyRef);
  private injector = inject(Injector);
  dialog = inject(MatDialog);
  private store = inject(ReportsStore);

  public readonly FilterName = FilterName;
  public readonly FilterTitle = FilterTitle;
  private destroy$: Subject<boolean> = new Subject<boolean>();
  sort = viewChild(MatSort);
  paginator = viewChild(MatPaginator);
  historyContent = viewChild<ElementRef<HTMLElement>>('historyContent');
  viewModel$ = this.store.viewModel$;
  private resizeObserver?: ResizeObserver;

  pageSize: number = DEFAULT_PAGE_SIZE;
  get pageSizeOptions(): readonly number[] {
    if (!PAGE_SIZE_OPTIONS.includes(this.pageSize)) {
      return [...PAGE_SIZE_OPTIONS, this.pageSize].sort((a, b) => a - b);
    }
    return PAGE_SIZE_OPTIONS;
  }
  private isUserSelectedPageSize = false;

  private readonly paginatorEffect = effect(() => {
    const paginator = this.paginator();
    if (paginator) {
      this.store.updatePaginator(paginator);
    }
  });

  private readonly sortEffect = effect(() => {
    const sort = this.sort();
    if (sort) {
      this.store.updateSort(sort);
    }
  });

  private readonly historyContentEffect = effect(() => {
    const historyContent = this.historyContent();
    if (historyContent?.nativeElement) {
      this.evaluateScreenSize();
      this.setupResizeObserver(historyContent.nativeElement);
    }
  });

  private setupResizeObserver(element: HTMLElement): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      this.evaluateScreenSize();
    });
    this.resizeObserver.observe(element);
  }

  constructor() {
    this.initResponsivePageSize();
    afterNextRender(
      () => {
        this.evaluateScreenSize();
      },
      { injector: this.injector }
    );
  }

  ngOnInit() {
    this.store.fetchReports();
    const sort = this.sort();
    if (sort) {
      this.store.updateSort(sort);
    }
    const paginator = this.paginator();
    if (paginator) {
      this.store.updatePaginator(paginator);
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.evaluateScreenSize();
  }

  private initResponsivePageSize(): void {
    this.breakpointObserver
      .observe([
        Breakpoints.XSmall,
        Breakpoints.Small,
        Breakpoints.Medium,
        Breakpoints.Large,
        Breakpoints.XLarge,
      ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.evaluateScreenSize();
      });

    this.evaluateScreenSize();
  }

  evaluateScreenSize(): void {
    if (this.isUserSelectedPageSize) {
      return;
    }
    const isMatched = (query: string): boolean => {
      return this.breakpointObserver.isMatched(query);
    };
    const windowHeight =
      typeof window !== 'undefined' ? window.innerHeight : undefined;
    const containerHeight = this.historyContent()?.nativeElement?.clientHeight;
    const newSize = this.calculatePageSizeFromQueries(
      isMatched,
      windowHeight,
      containerHeight && containerHeight > 0 ? containerHeight : undefined
    );
    this.updatePageSize(newSize);
  }

  calculatePageSizeFromQueries(
    isMatched: (query: string) => boolean,
    windowHeight?: number,
    containerHeight?: number
  ): number {
    let widthSize: number = SCREEN_SIZE_PAGE_SIZES.Medium;
    if (isMatched(Breakpoints.XSmall)) {
      widthSize = SCREEN_SIZE_PAGE_SIZES.XSmall;
    } else if (isMatched(Breakpoints.Small)) {
      widthSize = SCREEN_SIZE_PAGE_SIZES.Small;
    } else if (isMatched(Breakpoints.Medium)) {
      widthSize = SCREEN_SIZE_PAGE_SIZES.Medium;
    } else if (isMatched(Breakpoints.Large)) {
      widthSize = SCREEN_SIZE_PAGE_SIZES.Large;
    } else if (isMatched(Breakpoints.XLarge)) {
      widthSize = SCREEN_SIZE_PAGE_SIZES.XLarge;
    }

    return calculatePageSize({
      containerHeight,
      windowHeight,
      maxForBreakpoint: widthSize,
    });
  }

  updatePageSize(newSize: number): void {
    if (this.pageSize !== newSize) {
      this.pageSize = newSize;
      const paginator = this.paginator();
      if (paginator) {
        paginator.pageSize = newSize;
        if (
          typeof (paginator as { _changePageSize?: (size: number) => void })
            ._changePageSize === 'function'
        ) {
          (
            paginator as { _changePageSize: (size: number) => void }
          )._changePageSize(newSize);
        }
      }
    }
  }

  onPageChange(event: PageEvent): void {
    if (this.pageSize !== event.pageSize) {
      this.pageSize = event.pageSize;
      this.isUserSelectedPageSize = true;
    }
    if (event.length === 0) {
      this.liveAnnouncer.announce('No results found', 'polite');
      return;
    }
    const totalPages = Math.ceil(event.length / event.pageSize) || 1;
    const currentPage = event.pageIndex + 1;
    const startIndex = event.pageIndex * event.pageSize + 1;
    const endIndex = Math.min(
      (event.pageIndex + 1) * event.pageSize,
      event.length
    );
    this.liveAnnouncer.announce(
      `Showing results ${startIndex} to ${endIndex} of ${event.length}, page ${currentPage} of ${totalPages}`,
      'polite'
    );
  }

  public expandedRows: Set<HistoryTestrun> = new Set<HistoryTestrun>();
  public searchQuery: string = '';

  getRowId(data: HistoryTestrun | TestrunReport): string {
    const rawId =
      (data as { id?: string })?.id ||
      `${data.started || ''}-${(data as HistoryTestrun).deviceInfo || data.device?.model || ''}`;
    return rawId.toString().replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  toggleRowExpand(data: HistoryTestrun, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.expandedRows.has(data)) {
      this.expandedRows.delete(data);
      this.liveAnnouncer.announce(
        `Metadata collapsed for ${data.deviceInfo || 'test run'}`
      );
    } else {
      this.expandedRows.add(data);
      this.liveAnnouncer.announce(
        `Metadata expanded for ${data.deviceInfo || 'test run'}`
      );
    }
  }

  isExpanded(data: HistoryTestrun): boolean {
    return this.expandedRows.has(data);
  }

  getLocation(data: HistoryTestrun | TestrunReport): string | null | undefined {
    return data.host?.location;
  }

  getLinuxEnv(data: HistoryTestrun | TestrunReport): string | null | undefined {
    return data.host?.linux_env;
  }

  getKernel(data: HistoryTestrun | TestrunReport): string | null | undefined {
    return data.device?.kernel;
  }

  getPythonVersion(
    data: HistoryTestrun | TestrunReport
  ): string | null | undefined {
    return data.host?.python_version;
  }

  applySearchQuery() {
    this.store.setFilteredValuesQuickSearch(this.searchQuery);
  }

  onSearchQueryChanged(query: string) {
    this.searchQuery = query;
    this.applySearchQuery();
  }

  addSearchTag(tag: string) {
    this.searchQuery = tag;
    this.applySearchQuery();
  }

  clearSearchQuery() {
    this.searchQuery = '';
    this.applySearchQuery();
  }

  getFormattedDateString(date: string | null) {
    return date ? this.datePipe.transform(date, 'd MMM y H:mm') : '';
  }
  sortData(sortState: Sort) {
    const sort = this.sort();
    if (sort) {
      this.store.updateSort(sort);
    }
    if (sortState.direction) {
      this.liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this.liveAnnouncer.announce('Sorting cleared');
    }
  }

  public getResultClass(status: string): StatusResultClassName {
    return this.testRunService.getResultClass(status);
  }

  openFilter({
    event,
    filter,
    title,
    filterOpened,
    menuRect,
    itemRect,
  }: OpenFilterEvent) {
    event.preventDefault();
    event.stopPropagation();
    const target = new ElementRef(event.currentTarget);

    if (!filterOpened) {
      this.openFilterDialog(target, filter, title, menuRect, itemRect);
    }
  }

  openFilterDialog(
    target: ElementRef<EventTarget | null>,
    filter: string,
    title: string,
    menuRect?: DOMRect,
    itemRect?: DOMRect
  ) {
    this.store.setFilterOpened(true);
    this.store.setActiveFiler(filter);
    const dialogRef = this.dialog.open(FilterDialogComponent, {
      ariaLabel: 'Filters',
      data: {
        filter,
        title,
        trigger: target,
        menuRect,
        itemRect,
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
          if (filter === FilterName.Location) {
            this.store.setFilteredValuesLocation(filteredData.location);
          }
          if (filter === FilterName.LinuxEnv) {
            this.store.setFilteredValuesLinuxEnv(filteredData.linuxEnv);
          }
          if (filter === FilterName.PythonVersion) {
            this.store.setFilteredValuesPythonVersion(
              filteredData.pythonVersion
            );
          }
          if (filter === FilterName.Kernel) {
            this.store.setFilteredValuesKernel(filteredData.kernel);
          }
          if (filter === FilterName.AssessmentType) {
            this.store.setFilteredValuesAssessmentType(
              filteredData.assessmentType
            );
          }
        }
      });
  }

  filterCleared(filters: Filters) {
    this.searchQuery = Array.isArray(filters.quickSearch)
      ? (filters.quickSearch[0] ?? '')
      : filters.quickSearch || '';
    this.store.setFilteredValues(filters);
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  selectRow(row: MatRow) {
    this.store.setSelectedRow(row);
  }

  trackByStarted(index: number, item: HistoryTestrun) {
    return item.started;
  }

  focusNextButton() {
    // Try to focus next interactive element, if exists
    const next = (window.document.querySelector(
      '.report-selected + tr + tr a'
    ) ||
      window.document.querySelector(
        '.report-selected + tr a'
      )) as HTMLButtonElement;
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

  removeReport(data: TestrunReport) {
    this.store.deleteReport(data.delete);
    this.focusNextButton();
  }
}
