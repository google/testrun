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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ListItemComponent } from './list-item.component';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import {
  MatMenuHarness,
  MatMenuItemHarness,
} from '@angular/material/menu/testing';

interface Entity {
  id: number;
  name: string;
}

describe('ListItemComponent', () => {
  let component: ListItemComponent<Entity>;
  let fixture: ComponentFixture<ListItemComponent<Entity>>;
  let compiled: HTMLElement;
  let loader: HarnessLoader;
  const testActions = [
    { action: 'Edit', icon: 'edit_icon' },
    { action: 'Delete', icon: 'delete_icon' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ListItemComponent,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListItemComponent<Entity>);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('actions', testActions);
    fixture.componentRef.setInput('entity', { id: 1, name: 'test' } as Entity);
    compiled = fixture.nativeElement as HTMLElement;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  describe('menu', () => {
    let menu;
    let items: MatMenuItemHarness[];

    beforeEach(async () => {
      menu = await loader.getHarness(MatMenuHarness);
      await menu.open();
      items = await menu.getItems();
    });

    it('should render actions in the menu', async () => {
      expect(items.length).toBe(2);

      const text0 = await items[0].getText();
      const text1 = await items[1].getText();

      expect(text0).toContain('Edit');
      expect(text1).toContain('Delete');
    });

    it('should emit the correct action when a menu item is clicked', async () => {
      const menuItemClickedSpy = spyOn(component.menuItemClicked, 'emit');

      await items[0].click();

      expect(menuItemClickedSpy).toHaveBeenCalledWith('Edit');
    });

    it('should display the correct icons for actions', async () => {
      const text0 = await items[0].getText();
      const text1 = await items[1].getText();

      expect(text0).toContain('edit');
      expect(text1).toContain('delete');
    });
  });

  it('should render menu button', () => {
    const button = compiled.querySelector('button[mat-icon-button]');

    expect(button).toBeTruthy();
    expect(button?.textContent).toContain('more_vert');
  });
});
