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
  computed,
  inject,
  input,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { ListItemComponent } from '../list-item/list-item.component';
import { EntityAction, EntityActionResult } from '../../model/entity-action';
import { Device } from '../../model/device';
import { LayoutType } from '../../model/layout-type';
import { Profile } from '../../model/profile';

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
  providers: [DatePipe],
  templateUrl: './list-layout.component.html',
  styleUrl: './list-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListLayoutComponent<T extends object> {
  private datePipe = inject(DatePipe);
  readonly LayoutType = LayoutType;
  title = input<string>('');
  addEntityText = input<string>('');
  entityDisabled = input<(arg: T) => boolean>();
  entityTooltip = input<(arg: T) => string>();
  isOpenEntityForm = input<boolean>(false);
  initialEntity = input<T | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emptyContent = input<TemplateRef<any>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content = input<TemplateRef<any>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemTemplate = input<TemplateRef<any>>();
  entities = input<T[]>([]);
  actions = input<EntityAction[]>([]);
  actionsFn = input<(arg: T) => EntityAction[]>();
  searchText = signal<string>('');
  filtered = computed(() => {
    return this.entities().filter(this.filter(this.searchText()));
  });
  addEntity = output<void>();
  menuItemClicked = output<EntityActionResult<T>>();

  getActions = (entity: T) => {
    if (this.actionsFn()) {
      // @ts-expect-error actionsFn is defined
      return this.actionsFn()(entity);
    }
    return this.actions();
  };

  clearSearch(): void {
    this.searchText.set('');
  }

  updateQuery(e: Event) {
    const input = e.target as HTMLInputElement;
    const value = input.value;
    if (value.trim() === '') {
      input.value = '';
    } else {
      const inputValue = value.trim();
      const searchValue = inputValue.length > 2 ? inputValue : '';
      this.searchText.set(searchValue);
    }
  }

  filter(searchText: string) {
    return <T extends object>(item: T) => {
      const filterItem = this.getObjectForFilter(item);
      return Object.values(filterItem).some(value => {
        return typeof value === 'string'
          ? value.toLowerCase().includes(searchText.toLowerCase())
          : false;
      });
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getObjectForFilter(item: any) {
    if (this.title() === LayoutType.Device) {
      const device = item as Device;
      return {
        model: device.model,
        manufacturer: device.manufacturer,
      };
    } else if (this.title() === LayoutType.Profile) {
      const profile = item as Profile;
      return {
        name: profile.name,
        risk: profile.risk,
        created: this.getFormattedDateString(profile.created),
      };
    } else {
      return item;
    }
  }

  getFormattedDateString(createdDate: string | undefined) {
    return createdDate
      ? this.datePipe.transform(createdDate, 'dd MMM yyyy')
      : '';
  }

  onMenuItemClick(action: string, entity: T, index: number) {
    this.menuItemClicked.emit({
      action,
      entity,
      index,
    });
  }
}
