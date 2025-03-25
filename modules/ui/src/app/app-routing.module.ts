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
import { Routes } from '@angular/router';
import { ReportsComponent } from './pages/reports/reports.component';
import { DevicesComponent } from './pages/devices/devices.component';
import { CanDeactivateGuard } from './guards/can-deactivate.guard';
import { TestrunComponent } from './pages/testrun/testrun.component';
import { RiskAssessmentComponent } from './pages/risk-assessment/risk-assessment.component';
import { CertificatesComponent } from './pages/certificates/certificates.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { GeneralSettingsComponent } from './pages/general-settings/general-settings.component';

export const routes: Routes = [
  {
    path: 'settings',
    component: SettingsComponent,
    title: 'Testrun - Settings',
    children: [
      {
        path: '',
        redirectTo: 'general',
        pathMatch: 'full',
      },
      {
        path: 'certificates',
        component: CertificatesComponent,
        title: 'Testrun - Certificates',
      },
      {
        path: 'general',
        component: GeneralSettingsComponent,
        title: 'Testrun - General Settings',
      },
    ],
  },
  {
    path: 'testing',
    component: TestrunComponent,
    title: 'Testrun - Testing',
  },
  {
    path: 'devices',
    component: DevicesComponent,
    canDeactivate: [CanDeactivateGuard],
    title: 'Testrun - Devices',
  },
  {
    path: 'reports',
    component: ReportsComponent,
    title: 'Testrun - Reports',
  },
  {
    path: 'risk-assessment',
    component: RiskAssessmentComponent,
    canDeactivate: [CanDeactivateGuard],
    title: 'Testrun - Risk Assessment',
  },
  {
    path: '',
    redirectTo: 'devices',
    pathMatch: 'full',
  },
];
