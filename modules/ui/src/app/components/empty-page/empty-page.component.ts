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
  selector: 'app-empty-page',
  imports: [EmptyMessageComponent],
  templateUrl: './empty-page.component.html',
})
export class EmptyPageComponent {
  image = input<string>();
  header = input<string>();
  message = input<string>();
  messageNext = input<string>();
}
