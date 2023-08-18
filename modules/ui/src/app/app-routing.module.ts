import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

const routes: Routes = [
  {
    path: 'runtime',
    loadChildren: () => import('./progress/progress.module').then(m => m.ProgressModule)
  },
  {
    path: 'device-repository',
    loadChildren: () => import('./device-repository/device-repository.module').then(m => m.DeviceRepositoryModule)
  },
  {
    path: 'results',
    loadChildren: () => import('./history/history.module').then(m => m.HistoryModule)
  },
  {
    path: '',
    redirectTo: 'runtime',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
