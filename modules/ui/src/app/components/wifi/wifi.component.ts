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
import { Component, Input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'app-wifi',

  imports: [MatIcon, MatTooltip, MatIconButton],
  templateUrl: './wifi.component.html',
  styles: `
    .wifi-button.disabled {
      opacity: 0.6;
    }
  `,
})
export class WifiComponent {
  @Input() on: boolean | null = null;
  @Input() disable: boolean = false;

  getLabel(on: boolean | null, disable: boolean = false) {
    if (disable) {
      return 'Internet connection is not being monitored.';
    }
    return on
      ? 'Testrun detects a working internet connection for the device under test.'
      : 'No internet connection detected for the device under test.';
  }
}
