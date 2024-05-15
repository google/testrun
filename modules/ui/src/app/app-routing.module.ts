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
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'testing',
    loadChildren: () =>
      import('./pages/testrun/progress.module').then(m => m.ProgressModule),
    title: 'Testrun',
  },
  {
    path: 'devices',
    loadChildren: () =>
      import('./pages/devices/device-repository.module').then(
        m => m.DeviceRepositoryModule
      ),
    title: 'Testrun - Devices',
  },
  {
    path: 'reports',
    loadChildren: () =>
      import('./pages/reports/reports.module').then(m => m.ReportsModule),
    title: 'Testrun - Reports',
  },
  {
    path: 'risk-assessment',
    loadChildren: () =>
      import('./pages/risk-assessment/risk-assessment.module').then(
        m => m.RiskAssessmentModule
      ),
    title: 'Testrun - Risk Assessment',
  },
  {
    path: '',
    redirectTo: 'devices',
    pathMatch: 'full',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
