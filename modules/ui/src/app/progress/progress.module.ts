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
import {ProgressInitiateFormComponent} from './progress-initiate-form/progress-initiate-form.component';
import {MatDialogModule} from '@angular/material/dialog';
import {DeviceItemComponent} from '../components/device-item/device-item.component';

@NgModule({
  declarations: [
    ProgressComponent,
    ProgressBreadcrumbsComponent,
    ProgressStatusCardComponent,
    ProgressTableComponent,
    ProgressInitiateFormComponent
  ],
  imports: [
    CommonModule,
    ProgressRoutingModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatTableModule,
    MatDialogModule,
    DeviceItemComponent,
  ]
})
export class ProgressModule {
}
