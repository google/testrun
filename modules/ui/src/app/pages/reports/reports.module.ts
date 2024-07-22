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
import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReportsComponent } from './reports.component';
import { ReportsRoutingModule } from './reports-routing.module';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { DownloadReportComponent } from '../../components/download-report/download-report.component';
import { MatSortModule } from '@angular/material/sort';
import { FilterDialogComponent } from './components/filter-dialog/filter-dialog.component';
import { FilterChipsComponent } from './components/filter-chips/filter-chips.component';
import { DeleteReportComponent } from './components/delete-report/delete-report.component';
import { DownloadReportZipComponent } from '../../components/download-report-zip/download-report-zip.component';
import { DownloadReportPdfComponent } from '../../components/download-report-pdf/download-report-pdf.component';

@NgModule({
  declarations: [ReportsComponent],
  imports: [
    CommonModule,
    ReportsRoutingModule,
    MatTableModule,
    MatIconModule,
    MatToolbarModule,
    MatSortModule,
    DownloadReportComponent,
    FilterDialogComponent,
    FilterChipsComponent,
    DeleteReportComponent,
    DownloadReportZipComponent,
    DownloadReportPdfComponent,
  ],
  providers: [DatePipe],
})
export class ReportsModule {}
