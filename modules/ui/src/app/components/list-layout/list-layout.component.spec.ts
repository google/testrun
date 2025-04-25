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
import { ListLayoutComponent } from './list-layout.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ListItemComponent } from '../list-item/list-item.component';
import { Component } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

interface Entity {
  id: number;
  name: string;
}
@Component({
  selector: 'app-host-component',
  imports: [ListLayoutComponent, ListItemComponent],
  template: `
    <app-list-layout
      [title]="title"
      [addEntityText]="addEntityText"
      [entities]="entities"
      [actions]="actions"
      [itemTemplate]="defaultItemTemplate"
      [emptyContent]="empty"
      (addEntity)="onAddEntity()"
      (menuItemClicked)="onMenuItemClicked($event)"></app-list-layout>

    <ng-template #defaultItemTemplate let-entity="entity">
      <div class="default-item">{{ entity.name }}</div>
    </ng-template>

    <ng-template #empty>
      <div class="empty-page">Empty</div>
    </ng-template>
  `,
})
class HostComponent {
  title = 'Test Title';
  addEntityText = 'Add Entity';
  entities: Entity[] = [];
  actions = [{ label: 'Edit', value: 'edit' }];
  onAddEntity = jasmine.createSpy('onAddEntity');
  onMenuItemClicked = jasmine.createSpy('onMenuItemClicked');
}

describe('ListLayoutComponent', () => {
  let component: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let compiled: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HostComponent,
        MatSidenavModule,
        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('with no entities', () => {
    beforeEach(() => {
      component.entities = [];
      fixture.detectChanges();
    });

    it('should display the title', () => {
      const titleElement = compiled.querySelector('.title');

      expect(titleElement?.textContent).toBe('Test Title');
    });

    it('should has empty content', () => {
      const emptyContent = compiled.querySelector('.content-empty');

      expect(emptyContent).toBeTruthy();
    });
  });

  describe('with entities', () => {
    beforeEach(() => {
      component.entities = [
        { id: 1, name: 'Entity 1' },
        { id: 2, name: 'Entity 2' },
      ];
      fixture.detectChanges();
    });

    it('should display the title', () => {
      const titleElement = compiled.querySelector('.title');

      expect(titleElement?.textContent).toBe('Test Title');
    });

    it('should display add entity button', () => {
      const buttonElement = compiled.querySelector('.add-entity-button');

      expect(buttonElement?.textContent).toContain('Add Entity');
    });

    it('should display search field', () => {
      const searchElement = compiled.querySelector('.search-field');

      expect(searchElement).toBeTruthy();
    });

    it('should emit addEntity event when add entity button is clicked', () => {
      const buttonElement = compiled.querySelector(
        '.add-entity-button'
      ) as HTMLButtonElement;

      buttonElement.click();
      expect(component.onAddEntity).toHaveBeenCalled();
    });

    it('should have entity list', () => {
      const listItemComponent = compiled.querySelectorAll('app-list-item');

      expect(listItemComponent.length).toEqual(2);
    });
  });
});
