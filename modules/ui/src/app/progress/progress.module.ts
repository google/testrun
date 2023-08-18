import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatTableModule} from '@angular/material/table';

import {ProgressRoutingModule} from './progress-routing.module';
import {ProgressComponent} from './progress.component';
import {ProgressBreadcrumbsComponent} from './progress-breadcrumbs/progress-breadcrumbs.component';
import {ProgressStatusCardComponent} from './progress-status-card/progress-status-card.component';
import {ProgressTableComponent} from './progress-table/progress-table.component';

@NgModule({
  declarations: [
    ProgressComponent,
    ProgressBreadcrumbsComponent,
    ProgressStatusCardComponent,
    ProgressTableComponent
  ],
  imports: [
    CommonModule,
    ProgressRoutingModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatTableModule
  ]
})
export class ProgressModule {
}
