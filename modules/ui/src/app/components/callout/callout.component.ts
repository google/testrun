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
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CalloutType } from '../../model/callout-type';
import { ProgramType } from '../../model/program-type';
import { ProgramTypeIconComponent } from '../program-type-icon/program-type-icon.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    ProgramTypeIconComponent,
  ],
  selector: 'app-callout',
  standalone: true,
  styleUrls: ['./callout.component.scss'],
  templateUrl: './callout.component.html',
})
export class CalloutComponent {
  readonly CalloutType = CalloutType;
  readonly ProgramType = ProgramType;
  @Input() id: string | null = null;
  @Input() type = '';
  @Input() closable = false;
  @Output() calloutClosed = new EventEmitter<string | null>();
}
