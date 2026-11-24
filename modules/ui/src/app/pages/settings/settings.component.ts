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
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';

import { MatTabsModule } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { Routes } from '../../model/routes';

@Component({
  selector: 'app-settings',
  imports: [MatToolbarModule, MatTabsModule, RouterModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  /**
   * Each tab links to a settings page, which opens in the tab panel that the
   * tabs control. The router marks the tab of the current page as selected.
   */
  readonly tabs = [
    { label: 'General', path: Routes.General },
    { label: 'Certificates', path: Routes.Certificates },
  ];
}
