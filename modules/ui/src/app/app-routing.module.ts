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
import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {allowToRunTestGuard} from './guards/allow-to-run-test.guard';

const routes: Routes = [
  {
    path: 'runtime',
    canActivate: [allowToRunTestGuard],
    loadChildren: () => import('./progress/progress.module').then(m => m.ProgressModule)
  },
  {
    path: 'device-repository',
    loadChildren: () => import('./device-repository/device-repository.module').then(m => m.DeviceRepositoryModule)
  },
  {
    path: 'results',
    canActivate: [allowToRunTestGuard],
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
