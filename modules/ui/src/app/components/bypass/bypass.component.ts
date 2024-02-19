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
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
<<<<<<< HEAD
import { StateService } from '../../services/state.service';
=======
import { FocusManagerService } from '../../services/focus-manager.service';
>>>>>>> dev

@Component({
  selector: 'app-bypass',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './bypass.component.html',
  styleUrls: ['./bypass.component.scss'],
})
export class BypassComponent {
<<<<<<< HEAD
  constructor(private readonly state: StateService) {}
  skipToMainContent(event: Event) {
    event.preventDefault();
    this.state.focusFirstElementInMain();
=======
  constructor(private readonly focusManagerService: FocusManagerService) {}
  skipToMainContent(event: Event) {
    event.preventDefault();
    this.focusManagerService.focusFirstElementInContainer();
>>>>>>> dev
  }
}
