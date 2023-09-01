import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {DeviceRepositoryComponent} from './device-repository.component';

const routes: Routes = [{path: '', component: DeviceRepositoryComponent}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DeviceRepositoryRoutingModule {
}
