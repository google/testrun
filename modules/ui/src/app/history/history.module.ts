import {NgModule} from '@angular/core';
import {CommonModule, DatePipe} from '@angular/common';
import {HistoryComponent} from './history.component';
import {HistoryRoutingModule} from './history-routing.module';
import {MatTableModule} from '@angular/material/table';
import {MatIconModule} from '@angular/material/icon';
import {MatToolbarModule} from '@angular/material/toolbar';
import {DownloadReportComponent} from '../components/download-report/download-report.component';

@NgModule({
  declarations: [
    HistoryComponent,
  ],
  imports: [
    CommonModule,
    HistoryRoutingModule,
    MatTableModule,
    MatIconModule,
    MatToolbarModule,
    DownloadReportComponent
  ],
  providers: [DatePipe]
})
export class HistoryModule {
}
