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
import { MatButton, MatIconButton } from '@angular/material/button';

@Component({
  selector: 'app-wifi',
  standalone: true,
  imports: [MatIcon, MatTooltip, MatButton, MatIconButton],
  templateUrl: './wifi.component.html',
  styleUrl: './wifi.component.scss',
})
export class WifiComponent {
  @Input() on: boolean | null = true;
  @Input() disable: boolean = false;

  getLabel(on: boolean | null) {
    return on ? 'Internet connection' : 'No Internet connection';
  }
}
