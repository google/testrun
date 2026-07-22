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
  viewChild,
  inject,
} from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
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
import { FilterName, FilterTitle, Filters } from '../../model/filters';
import { ReportsStore } from './reports.store';
import {
  FilterHeaderComponent,
  OpenFilterEvent,
} from './components/filter-header/filter-header.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { FilterChipsComponent } from './components/filter-chips/filter-chips.component';
import { DownloadReportZipComponent } from '../../components/download-report-zip/download-report-zip.component';
import { DownloadReportPdfComponent } from '../../components/download-report-pdf/download-report-pdf.component';
import { DeleteReportComponent } from './components/delete-report/delete-report.component';
import { FilterDialogComponent } from './components/filter-dialog/filter-dialog.component';
import { EmptyMessageComponent } from '../../components/empty-message/empty-message.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

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
    FilterChipsComponent,
    DeleteReportComponent,
    DownloadReportZipComponent,
    DownloadReportPdfComponent,
    FilterHeaderComponent,
    EmptyMessageComponent,
    MatSortModule,
    MatIcon,
    MatTooltipModule,
  ],
  providers: [ReportsStore, DatePipe],
  animations: [
    trigger('detailExpand', [
      state(
        'collapsed,void',
        style({ height: '0px', minHeight: '0', display: 'none' })
      ),
      state('expanded', style({ height: '*' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ),
    ]),
  ],
})
export class ReportsComponent implements OnInit, OnDestroy {
  private testRunService = inject(TestRunService);
  private datePipe = inject(DatePipe);
  private liveAnnouncer = inject(LiveAnnouncer);
  dialog = inject(MatDialog);
  private store = inject(ReportsStore);

  public readonly FilterName = FilterName;
  public readonly FilterTitle = FilterTitle;
  private destroy$: Subject<boolean> = new Subject<boolean>();
  sort = viewChild(MatSort);
  viewModel$ = this.store.viewModel$;

  ngOnInit() {
    this.store.fetchReports();
    const sort = this.sort();
    if (sort) {
      this.store.updateSort(sort);
    }
  }

  public expandedRows: Set<HistoryTestrun> = new Set<HistoryTestrun>();
  public searchQuery: string = '';

  toggleRowExpand(data: HistoryTestrun, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.expandedRows.has(data)) {
      this.expandedRows.delete(data);
    } else {
      this.expandedRows.add(data);
    }
  }

  isExpanded(data: HistoryTestrun): boolean {
    return this.expandedRows.has(data);
  }

  getLocation(data: HistoryTestrun): string {
    return (
      data.location ||
      (data.device as any)?.location ||
      'Data Center Alpha - Rack 12, Bay B'
    );
  }

  getLinuxEnv(data: HistoryTestrun): string {
    return (
      data.linux_env ||
      (data.device as any)?.linux_env ||
      'Ubuntu 24.04 LTS (x86_64)'
    );
  }

  getKernel(data: HistoryTestrun): string {
    return (
      data.kernel || (data.device as any)?.kernel || 'Linux 6.8.0-40-generic'
    );
  }

  applySearchQuery() {
    this.store.setFilteredValuesQuickSearch(this.searchQuery);
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

  openFilter({ event, filter, title, filterOpened }: OpenFilterEvent) {
    event.preventDefault();
    event.stopPropagation();
    const target = new ElementRef(event.currentTarget);

    if (!filterOpened) {
      this.openFilterDialog(target, filter, title);
    }
  }

  openFilterDialog(
    target: ElementRef<EventTarget | null>,
    filter: string,
    title: string
  ) {
    this.store.setFilterOpened(true);
    this.store.setActiveFiler(filter);
    const dialogRef = this.dialog.open(FilterDialogComponent, {
      ariaLabel: 'Filters',
      data: {
        filter,
        title,
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
    this.searchQuery = filters.quickSearch || '';
    this.store.setFilteredValues(filters);
  }

  ngOnDestroy() {
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
