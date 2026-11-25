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
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { ListLayoutComponent } from './list-layout.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ListItemComponent } from '../list-item/list-item.component';
import { Component } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { LayoutType } from '../../model/layout-type';
import { Profile, ProfileRisk, ProfileStatus } from '../../model/profile';
import { LiveAnnouncer } from '@angular/cdk/a11y';

interface Entity {
  id?: number;
  name: string;
  risk?: string;
  status?: ProfileStatus;
  created?: string;
  questions?: Profile['questions'];
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
      [isOpenEntityForm]="isOpenEntityForm"
      [initialEntity]="initialEntity"
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
  isOpenEntityForm = false;
  initialEntity: Entity | null = null;
  onAddEntity = jasmine.createSpy('onAddEntity');
  onMenuItemClicked = jasmine.createSpy('onMenuItemClicked');
}

type Rgb = [number, number, number];

/** Parses a computed `rgb()`/`rgba()` or `color(srgb …)` value; alpha is ignored. */
function parseColor(value: string): Rgb {
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(value);
  if (srgb) {
    return [
      Number(srgb[1]) * 255,
      Number(srgb[2]) * 255,
      Number(srgb[3]) * 255,
    ];
  }
  const rgb = /^rgba?\(([\d.]+),?\s*([\d.]+),?\s*([\d.]+)/.exec(value);
  if (!rgb) {
    throw new Error(`Unsupported color format: ${value}`);
  }
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
}

/** WCAG 2.2 relative luminance. */
function luminance([r, g, b]: Rgb): number {
  const [lr, lg, lb] = [r, g, b].map(channel => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG contrast ratio (1–21) between two computed colors. */
function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [
    luminance(parseColor(foreground)),
    luminance(parseColor(background)),
  ].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

/** First non-transparent background of the element or its ancestors. */
function effectiveBackground(element: Element): string {
  for (let el: Element | null = element; el; el = el.parentElement) {
    const background = getComputedStyle(el).backgroundColor;
    if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') {
      return background;
    }
  }
  return 'rgb(255, 255, 255)';
}

describe('ListLayoutComponent', () => {
  let component: HostComponent;
  let fixture: ComponentFixture<HostComponent>;
  let compiled: HTMLElement;
  let listLayoutComponentInstance: ListLayoutComponent<Entity>;
  let mockLiveAnnouncer: jasmine.SpyObj<LiveAnnouncer>;

  beforeEach(async () => {
    mockLiveAnnouncer = jasmine.createSpyObj('LiveAnnouncer', ['announce']);

    await TestBed.configureTestingModule({
      imports: [
        HostComponent,
        MatSidenavModule,
        MatToolbarModule,
        MatIconModule,
        MatButtonModule,
        NoopAnimationsModule,
      ],
      providers: [{ provide: LiveAnnouncer, useValue: mockLiveAnnouncer }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;

    const listLayoutDebugElement = fixture.debugElement.query(
      By.directive(ListLayoutComponent)
    );
    listLayoutComponentInstance =
      listLayoutDebugElement.componentInstance as ListLayoutComponent<Entity>;

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

    it('clearSearch() should reset searchText to an empty string and clear input', fakeAsync(() => {
      const searchInputElement = compiled.querySelector(
        '.search-field input'
      ) as HTMLInputElement;
      expect(searchInputElement).toBeTruthy();

      searchInputElement.value = 'testing';
      searchInputElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick();

      // Verify ListLayoutComponent's internal searchText is updated
      expect(listLayoutComponentInstance.searchText()).toBe('testing');

      const buttonClearSearch = compiled.querySelector(
        '.clear-search-button'
      ) as HTMLButtonElement;
      expect(buttonClearSearch).toBeTruthy();

      buttonClearSearch.click();
      fixture.detectChanges();
      tick();

      // Verify ListLayoutComponent's internal searchText is cleared
      expect(listLayoutComponentInstance.searchText()).toBe('');

      // Verify the input field in the DOM is also cleared
      expect(searchInputElement.value).toBe('');

      // Verify the clear button is gone and the search icon is still shown
      const clearButtonAfterClear = compiled.querySelector(
        '.clear-search-button'
      );
      expect(clearButtonAfterClear).toBeNull();
      const searchIcon = compiled.querySelector(
        '.search-field mat-icon:not(button mat-icon)'
      );
      expect(searchIcon).toBeTruthy();
      expect(searchIcon?.textContent?.trim()).toBe('search');
    }));

    it('should render visible empty-search message and announce "No devices found" when search returns zero matches', fakeAsync(() => {
      const searchInputElement = compiled.querySelector(
        '.search-field input'
      ) as HTMLInputElement;

      searchInputElement.value = 'zzzzz';
      searchInputElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick();

      const emptyMessage = compiled.querySelector(
        'section.entity-list .empty-search-message'
      );
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage?.textContent?.trim()).toBe('No devices found');
      expect(emptyMessage?.getAttribute('role')).toBe('status');
      expect(emptyMessage?.getAttribute('aria-live')).toBe('polite');
      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        'No devices found',
        'polite'
      );
    }));

    it('should announce matching device count when filtering and when clearing search', fakeAsync(() => {
      const searchInputElement = compiled.querySelector(
        '.search-field input'
      ) as HTMLInputElement;

      searchInputElement.value = 'Entity 1';
      searchInputElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick();

      const statusRegion = compiled.querySelector(
        'section.entity-list [role="status"][aria-live="polite"]'
      );
      expect(statusRegion?.textContent?.trim()).toBe('1 device found');
      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        '1 device found',
        'polite'
      );

      mockLiveAnnouncer.announce.calls.reset();
      searchInputElement.value = '';
      searchInputElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick();

      expect(listLayoutComponentInstance.searchText()).toBe('');
      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        '2 devices found',
        'polite'
      );
    }));

    describe('search input focus ring', () => {
      let searchInputElement: HTMLInputElement;

      beforeEach(() => {
        searchInputElement = compiled.querySelector(
          '.search-field input'
        ) as HTMLInputElement;
      });

      afterEach(() => {
        searchInputElement.blur();
        document.body.classList.remove('using-mouse');
      });

      it('should show a high-contrast focus ring for keyboard users', () => {
        searchInputElement.focus();

        const style = getComputedStyle(searchInputElement);
        expect(style.outlineStyle).toBe('solid');
        expect(style.outlineWidth).toBe('2px');
        expect(style.outlineColor).toBe('rgb(0, 0, 0)');
      });

      it('should not show the focus ring while the mouse is being used', () => {
        // AppComponent toggles `using-mouse` on <body> on mouse interaction.
        document.body.classList.add('using-mouse');

        searchInputElement.focus();

        expect(getComputedStyle(searchInputElement).outlineStyle).toBe('none');
      });
    });

    describe('search field purpose', () => {
      let searchField: HTMLElement;
      let searchInputElement: HTMLInputElement;

      beforeEach(() => {
        searchField = compiled.querySelector('.search-field') as HTMLElement;
        searchInputElement = searchField.querySelector(
          'input'
        ) as HTMLInputElement;
      });

      /** Rendered magnifying glass icons in the field, not counting buttons. */
      function visibleSearchIcons(): HTMLElement[] {
        return Array.from(
          searchField.querySelectorAll<HTMLElement>(
            'mat-icon:not(button mat-icon)'
          )
        ).filter(icon => {
          const { width, height } = icon.getBoundingClientRect();
          return (
            icon.textContent?.trim() === 'search' &&
            width > 0 &&
            height > 0 &&
            getComputedStyle(icon).visibility === 'visible'
          );
        });
      }

      /** The search icon shown in front of the input; throws if there is none. */
      function leadingSearchIcon(): HTMLElement {
        const inputLeft = searchInputElement.getBoundingClientRect().left;
        const icon = visibleSearchIcons().find(
          searchIcon => searchIcon.getBoundingClientRect().right <= inputLeft
        );
        if (!icon) {
          throw new Error('No search icon is shown in front of the input');
        }
        return icon;
      }

      /** Types a query the way a user does; call inside `fakeAsync`. */
      function typeQuery(query: string): void {
        searchInputElement.value = query;
        searchInputElement.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        tick();
      }

      /** Checks that the icon, query, and clear button sit side by side. */
      function expectSearchPartsToFitInField(): void {
        const field = searchField.getBoundingClientRect();
        const icon = leadingSearchIcon().getBoundingClientRect();
        const input = searchInputElement.getBoundingClientRect();
        const clearButton = (
          compiled.querySelector('.clear-search-button') as HTMLElement
        ).getBoundingClientRect();

        expect(icon.left)
          .withContext('icon starts inside the field')
          .toBeGreaterThanOrEqual(field.left);
        expect(input.left)
          .withContext('input starts after the icon')
          .toBeGreaterThanOrEqual(icon.right);
        expect(clearButton.left)
          .withContext('clear button starts after the input')
          .toBeGreaterThanOrEqual(input.right);
        expect(clearButton.right)
          .withContext('clear button ends inside the field')
          .toBeLessThanOrEqual(field.right);
      }

      it('should lead the input with a search icon hidden from assistive technology', () => {
        const icon = leadingSearchIcon();

        expect(icon.getAttribute('aria-hidden')).toBe('true');
        expect(visibleSearchIcons())
          .withContext('only one search icon')
          .toEqual([icon]);
      });

      it('should give the search icon at least 3:1 contrast against the field', () => {
        const icon = leadingSearchIcon();
        const ratio = contrastRatio(
          getComputedStyle(icon).color,
          effectiveBackground(icon)
        );

        expect(ratio)
          .withContext(`contrast ${ratio.toFixed(2)}:1`)
          .toBeGreaterThanOrEqual(3);
      });

      it('should keep the search icon visible before, during, and after text entry', fakeAsync(() => {
        expect(visibleSearchIcons().length)
          .withContext('before typing')
          .toBe(1);

        // The placeholder is gone, but the query is too short to filter yet.
        typeQuery('En');
        expect(visibleSearchIcons().length).withContext('while typing').toBe(1);

        typeQuery('Entity 1');
        const clearButton = compiled.querySelector(
          '.clear-search-button'
        ) as HTMLButtonElement;
        expect(clearButton).withContext('clear button').not.toBeNull();
        expect(visibleSearchIcons().length)
          .withContext('while filtering')
          .toBe(1);

        clearButton.click();
        fixture.detectChanges();
        tick();
        expect(visibleSearchIcons().length)
          .withContext('after clearing')
          .toBe(1);
      }));

      it('should give the placeholder at least 4.5:1 contrast against the field', () => {
        const placeholder = getComputedStyle(
          searchInputElement,
          '::placeholder'
        );
        const ratio = contrastRatio(
          placeholder.color,
          effectiveBackground(searchInputElement)
        );

        // The contrast helpers ignore opacity, so the placeholder must be opaque.
        expect(placeholder.opacity).toBe('1');
        expect(ratio)
          .withContext(`contrast ${ratio.toFixed(2)}:1`)
          .toBeGreaterThanOrEqual(4.5);
      });

      it('should name the search input after the devices it filters', () => {
        expect(searchInputElement.getAttribute('aria-label')).toBe(
          'Search devices'
        );
        expect(searchInputElement.placeholder).toBe('Search devices');
      });

      it('should fit the icon, query, and clear button inside the field', fakeAsync(() => {
        typeQuery('Entity 1');

        expectSearchPartsToFitInField();
      }));

      it('should fit the icon, query, and clear button inside the field at 320 CSS px', fakeAsync(() => {
        // WCAG 1.4.10 Reflow width, e.g. a 1280 px window at 400% zoom.
        const panel = compiled.querySelector(
          '.layout-container-left-panel'
        ) as HTMLElement;
        panel.style.width = '320px';
        typeQuery('Entity 1');

        expectSearchPartsToFitInField();
        expect(searchField.getBoundingClientRect().right)
          .withContext('search field ends inside the panel')
          .toBeLessThanOrEqual(panel.getBoundingClientRect().right);
      }));
    });
  });

  describe('when entity form is open without initial entity', () => {
    beforeEach(() => {
      component.isOpenEntityForm = true;
      component.initialEntity = null;
      fixture.detectChanges();
    });

    it('should display fake list item with edit_note icon', () => {
      const fakeItem = compiled.querySelector('.fake-list-item');
      expect(fakeItem).toBeTruthy();
      const icon = fakeItem?.querySelector('mat-icon');
      expect(icon?.textContent?.trim()).toBe('edit_note');
      const emptyMessage = compiled.querySelector('.empty-search-message');
      expect(emptyMessage).toBeNull();
    });
  });

  describe('when title is Profile', () => {
    beforeEach(() => {
      component.title = LayoutType.Profile;
      component.entities = [
        {
          name: 'Primary profile',
          risk: ProfileRisk.HIGH,
          status: ProfileStatus.VALID,
          created: '2023-06-23',
          questions: [],
        },
        {
          name: 'High security profile',
          risk: ProfileRisk.LIMITED,
          status: ProfileStatus.DRAFT,
          created: '2023-07-15',
          questions: [],
        },
      ];
      fixture.detectChanges();
    });

    it('should filter profiles by name and not by risk or status', fakeAsync(() => {
      const searchInputElement = compiled.querySelector(
        '.search-field input'
      ) as HTMLInputElement;

      searchInputElement.value = 'High';
      searchInputElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick();

      const filtered = listLayoutComponentInstance.filtered();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('High security profile');
      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        '1 risk profile found',
        'polite'
      );
    }));

    it('should filter profiles by formatted created date', fakeAsync(() => {
      const searchInputElement = compiled.querySelector(
        '.search-field input'
      ) as HTMLInputElement;

      searchInputElement.value = '23 Jun 2023';
      searchInputElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick();

      const filtered = listLayoutComponentInstance.filtered();
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe('Primary profile');
    }));

    it('should render "No risk profiles found" when profile search returns zero matches', fakeAsync(() => {
      const searchInputElement = compiled.querySelector(
        '.search-field input'
      ) as HTMLInputElement;

      searchInputElement.value = 'zzzzz';
      searchInputElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick();

      const emptyMessage = compiled.querySelector(
        'section.entity-list .empty-search-message'
      );
      expect(emptyMessage?.textContent?.trim()).toBe('No risk profiles found');
      expect(mockLiveAnnouncer.announce).toHaveBeenCalledWith(
        'No risk profiles found',
        'polite'
      );
    }));

    it('should name the search input after the risk profiles it filters', () => {
      const searchInputElement = compiled.querySelector(
        '.search-field input'
      ) as HTMLInputElement;

      expect(searchInputElement.getAttribute('aria-label')).toBe(
        'Search risk profiles'
      );
      expect(searchInputElement.placeholder).toBe('Search risk profiles');
    });
  });
});
