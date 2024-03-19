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
<<<<<<<< HEAD:modules/ui/src/app/components/callout/callout.component.ts
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-callout',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './callout.component.html',
  styleUrls: ['./callout.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalloutComponent {
  @Input() type = '';
========
@import '../../../theming/colors';

:host {
  display: grid;
  overflow: hidden;
  width: 570px;
  padding: 24px 16px 8px 24px;
  gap: 10px;
}

.delete-form-title {
  color: #202124;
  font-size: 18px;
  line-height: 24px;
}

.delete-form-content {
  font-family: Roboto, sans-serif;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: 0.2px;
  color: $grey-800;
}

.delete-form-actions {
  padding: 0;
  min-height: 30px;
>>>>>>>> main:modules/ui/src/app/components/delete-form/delete-form.component.scss
}
