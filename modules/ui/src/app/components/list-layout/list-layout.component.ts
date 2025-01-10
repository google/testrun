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
  Component,
  computed,
  input,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { ListItemComponent } from '../list-item/list-item.component';
import { EntityAction, EntityActionResult } from '../../model/entity-action';
import { Device } from '../../model/device';

@Component({
  selector: 'app-list-layout',
  imports: [
    CommonModule,
    MatButtonModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    ListItemComponent,
  ],
  templateUrl: './list-layout.component.html',
  styleUrl: './list-layout.component.scss',
})
export class ListLayoutComponent<T extends object> {
  title = input<string>('');
  addEntityText = input<string>('');
  isOpenDeviceForm = input<boolean>(false);
  initialDevice = input<Device | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emptyContent = input<TemplateRef<any>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content = input<TemplateRef<any>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemTemplate = input<TemplateRef<any>>();
  entities = input<T[]>([]);
  actions = input<EntityAction[]>([]);
  searchText = signal<string>('');
  filtered = computed(() => {
    return this.entities().filter(this.filter(this.searchText()));
  });
  addEntity = output<void>();
  menuItemClicked = output<EntityActionResult<T>>();
  updateQuery(e: Event) {
    this.searchText.set((e.target as HTMLInputElement).value.trim());
  }

  filter(searchText: string) {
    return <T extends object>(item: T) => {
      return Object.values(item).some(value =>
        typeof value === 'string'
          ? value.toLowerCase().includes(searchText.toLowerCase())
          : false
      );
    };
  }

  onMenuItemClick(action: string, entity: T, index: number) {
    this.menuItemClicked.emit({
      action,
      entity,
      index,
    });
  }
}
