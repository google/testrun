import {ScrollingModule} from '@angular/cdk/scrolling';
import {CommonModule} from '@angular/common';
import {HttpClientModule} from '@angular/common/http';
import {NgModule} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialogModule} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatToolbarModule} from '@angular/material/toolbar';
import {DeviceFormComponent} from './device-form/device-form.component';
import {DeviceItemComponent} from './device-item/device-item.component';

import {DeviceRepositoryRoutingModule} from './device-repository-routing.module';
import {DeviceRepositoryComponent} from './device-repository.component';

@NgModule({
  declarations: [
    DeviceRepositoryComponent,
    DeviceItemComponent,
    DeviceFormComponent,
  ],
  imports: [
    CommonModule,
    DeviceRepositoryRoutingModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    ScrollingModule,
    HttpClientModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatInputModule,
  ],
})
export class DeviceRepositoryModule {
}
