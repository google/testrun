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
import { Component, input } from '@angular/core';
import { EmptyMessageComponent } from '../empty-message/empty-message.component';
@Component({
  selector: 'app-no-entity-selected',
  imports: [EmptyMessageComponent],
  templateUrl: './no-entity-selected.component.html',
  styleUrl: './no-entity-selected.component.scss',
})
export class NoEntitySelectedComponent {
  image = input<string>();
  header = input<string>();
  message = input<string>();
}
