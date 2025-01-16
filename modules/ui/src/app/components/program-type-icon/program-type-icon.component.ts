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

@Component({
  selector: 'app-program-type-icon',

  imports: [MatIcon],
  template: ` <mat-icon [svgIcon]="type" class="icon"></mat-icon> `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
    }
    .icon {
      display: flex;
      line-height: 16px;
    }
  `,
})
export class ProgramTypeIconComponent {
  @Input() type = '';
}
