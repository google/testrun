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
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
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

  const testEntity: Entity = { id: 1, name: 'test' };

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
    fixture.componentRef.setInput('entity', testEntity);

    compiled = fixture.nativeElement as HTMLElement;
    loader = TestbedHarnessEnvironment.loader(fixture);
    fixture.detectChanges();
  });

  describe('menu', () => {
    let menu: MatMenuHarness;
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

  describe('actions menu button name', () => {
    const DEVICE = {
      manufacturer: 'Delta',
      model: '03-ENT-OP',
      mac_addr: '00:1e:42:35:73:c4',
    };

    function getMenuButton(): HTMLButtonElement {
      return compiled.querySelector('.list-item > button') as HTMLButtonElement;
    }

    function renderDevice(): void {
      fixture.componentRef.setInput('entity', DEVICE);
      fixture.detectChanges();
    }

    it('should name the menu button after the device it controls', () => {
      renderDevice();

      expect(getMenuButton().getAttribute('aria-label')).toBe(
        'Actions for Delta 03-ENT-OP'
      );
      expect(
        getMenuButton().querySelector('mat-icon')?.getAttribute('aria-hidden')
      ).toBe('true');
    });

    it('should name the menu button after a named entity, such as a risk profile', () => {
      expect(getMenuButton().getAttribute('aria-label')).toBe(
        'Actions for test'
      );
    });

    it('should show the name as its tooltip without repeating it as a description', async () => {
      renderDevice();
      // AriaDescriber updates aria-describedby asynchronously.
      await fixture.whenStable();

      const tooltip = fixture.debugElement
        .query(By.css('.list-item > button'))
        .injector.get(MatTooltip);
      expect(tooltip.message).toBe('Actions for Delta 03-ENT-OP');
      expect(getMenuButton().hasAttribute('aria-describedby')).toBeFalse();
    });
  });

  it('should call hide on outEvent', () => {
    const hideSpy = spyOn(component.tooltip, 'hide');
    component.outEvent();

    expect(hideSpy).toHaveBeenCalled();
  });

  describe('tooltip logic', () => {
    let mockTooltipElement: HTMLElement;

    beforeEach(() => {
      mockTooltipElement = document.createElement('div');
    });

    it('should show tooltip and query container on mouseenter (onEvent)', () => {
      const messageFn = (e: Entity) => `Info: ${e.name}`;
      fixture.componentRef.setInput('tooltipMessage', messageFn);

      const showSpy = spyOn(component.tooltip, 'show');

      const querySpy = spyOn(document, 'querySelector').and.returnValue(
        mockTooltipElement
      );

      const event = new MouseEvent('mouseenter', {
        clientX: 100,
        clientY: 200,
      });
      component.onEvent(event);

      expect(component.tooltip.message).toBe('Info: test');
      expect(showSpy).toHaveBeenCalledWith(0, { x: 100, y: 200 });
      expect(querySpy).toHaveBeenCalledWith(
        '.mat-mdc-tooltip-panel:has(.list-item-tooltip)'
      );
    });

    it('should update container position on mousemove (onMoveEvent)', () => {
      component.tooltip.message = 'Already set message';

      spyOn(document, 'querySelector').and.returnValue(mockTooltipElement);

      const x = 150;
      const y = 250;
      const event = new MouseEvent('mousemove', { clientX: x, clientY: y });

      component.onMoveEvent(event);

      expect(mockTooltipElement.style.top).toBe(`${y}px`);
      expect(mockTooltipElement.style.left).toBe(`${x}px`);
    });

    it('should NOT update styles if tooltip message is missing', () => {
      component.tooltip.message = '';
      const querySpy = spyOn(document, 'querySelector');

      const event = new MouseEvent('mousemove');
      component.onMoveEvent(event);

      expect(querySpy).not.toHaveBeenCalled();
    });
  });
});
