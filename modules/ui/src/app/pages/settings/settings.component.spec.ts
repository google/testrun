import { TestBed } from '@angular/core/testing';

import { SettingsComponent } from './settings.component';
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
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ENTER, RIGHT_ARROW, SPACE } from '@angular/cdk/keycodes';
import { FocusManagerService } from '../../services/focus-manager.service';

/** Stands in for the routed General settings page. */
@Component({
  selector: 'app-general-settings',
  template: '<p>General settings page</p>',
})
class FakeGeneralSettingsComponent {}

/** Stands in for the routed Certificates page. */
@Component({
  selector: 'app-certificates',
  template: '<p>Certificates page</p>',
})
class FakeCertificatesComponent {}

/** Collapses whitespace the way the accessible name computation does. */
function normalizeWhitespace(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/** Text of the elements referenced by an `aria-labelledby`/`aria-describedby` value. */
function textOfIdRefs(idRefs: string | null | undefined): string {
  return normalizeWhitespace(
    (idRefs ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map(id => document.getElementById(id)?.textContent ?? '')
      .join(' ')
  );
}

/** Dispatches a keydown like the browser does; CDK key managers read `keyCode`. */
function pressKey(
  target: Element,
  key: string,
  keyCode: number
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    keyCode,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

describe('SettingsComponent', () => {
  let harness: RouterTestingHarness;
  let component: SettingsComponent;
  let compiled: HTMLElement;

  /** Lets the router and the tab state settle, then renders them. */
  async function settle(): Promise<void> {
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  /** Tabs in DOM order, as exposed to assistive technology. */
  function getTabs(): HTMLElement[] {
    return Array.from(compiled.querySelectorAll<HTMLElement>('[role="tab"]'));
  }

  function getTab(name: string): HTMLElement {
    const tab = getTabs().find(
      tab => normalizeWhitespace(tab.textContent) === name
    );
    if (!tab) {
      throw new Error(`No tab named "${name}"`);
    }
    return tab;
  }

  /** Element that a tab points to with `aria-controls`. */
  function getControlledElement(tab: HTMLElement): HTMLElement | null {
    const id = tab.getAttribute('aria-controls');
    return id ? document.getElementById(id) : null;
  }

  /**
   * Expects `name` to be the only selected tab, and the element it controls
   * to be the tab panel that shows `pageSelector` and is named by the tab.
   */
  function expectPageInTabPanel(name: string, pageSelector: string): void {
    const panel = getControlledElement(getTab(name));

    expect(
      getTabs()
        .filter(tab => tab.getAttribute('aria-selected') === 'true')
        .map(tab => normalizeWhitespace(tab.textContent))
    )
      .withContext('selected tabs')
      .toEqual([name]);
    expect(panel?.getAttribute('role'))
      .withContext(`role of the element that the "${name}" tab controls`)
      .toBe('tabpanel');
    expect(panel?.querySelector(pageSelector))
      .withContext(`${pageSelector} inside the "${name}" tab panel`)
      .not.toBeNull();
    expect(textOfIdRefs(panel?.getAttribute('aria-labelledby')))
      .withContext('tab panel name')
      .toBe(name);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent, NoopAnimationsModule],
      providers: [
        // The settings routes of app-routing.module.ts, with stand-in pages.
        provideRouter([
          {
            path: 'settings',
            component: SettingsComponent,
            children: [
              { path: '', redirectTo: 'general', pathMatch: 'full' },
              { path: 'certificates', component: FakeCertificatesComponent },
              { path: 'general', component: FakeGeneralSettingsComponent },
            ],
          },
        ]),
      ],
    }).compileComponents();

    harness = await RouterTestingHarness.create();
    component = await harness.navigateByUrl('/settings', SettingsComponent);
    compiled = harness.routeNativeElement as HTMLElement;
    await settle();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('tabs', () => {
    it('should show the open page inside the tab panel that the selected tab controls', () => {
      const generalTab = getTab('General');
      const panel = getControlledElement(generalTab);

      expect(generalTab.getAttribute('aria-selected')).toBe('true');
      expect(panel?.getAttribute('role')).toBe('tabpanel');
      expect(panel?.querySelector('app-general-settings'))
        .withContext('General page inside the tab panel')
        .not.toBeNull();
    });

    it('should name the tab panel by the selected tab', () => {
      const generalTab = getTab('General');
      const panel = compiled
        .querySelector('app-general-settings')
        ?.closest('[role="tabpanel"]');

      expect(panel)
        .withContext('tab panel around the General page')
        .toBeTruthy();
      expect(panel?.getAttribute('aria-labelledby')).toBe(generalTab.id);
      expect(textOfIdRefs(panel?.getAttribute('aria-labelledby'))).toBe(
        'General'
      );
    });

    it('should not point any tab to an empty or hidden tab panel', () => {
      const panels =
        compiled.querySelectorAll<HTMLElement>('[role="tabpanel"]');

      expect(panels.length).withContext('number of tab panels').toBe(1);
      for (const tab of getTabs()) {
        const panel = getControlledElement(tab);
        const context = `tab panel of the "${normalizeWhitespace(tab.textContent)}" tab`;

        expect(panel).withContext(context).toBe(panels[0]);
        expect(panel?.getAttribute('aria-hidden'))
          .withContext(`${context} is hidden`)
          .not.toBe('true');
        expect(panel?.getBoundingClientRect().height)
          .withContext(`${context} height`)
          .toBeGreaterThan(0);
      }
    });

    it('should follow the route with the selected tab and its tab panel', async () => {
      await harness.navigateByUrl('/settings/certificates');
      await settle();

      expectPageInTabPanel('Certificates', 'app-certificates');
      expect(compiled.querySelector('app-general-settings')).toBeNull();
    });

    it('should open the clicked tab in the tab panel', async () => {
      getTab('Certificates').click();
      await settle();

      expectPageInTabPanel('Certificates', 'app-certificates');
    });
  });

  describe('with the keyboard', () => {
    it('should move focus with the arrow keys and open the focused tab with Enter', async () => {
      const generalTab = getTab('General');
      const certificatesTab = getTab('Certificates');
      expect(generalTab.tabIndex).withContext('selected tab').toBe(0);
      expect(certificatesTab.tabIndex).withContext('other tab').toBe(-1);

      generalTab.focus();
      pressKey(generalTab, 'ArrowRight', RIGHT_ARROW);
      harness.detectChanges();

      expect(document.activeElement)
        .withContext('focus after ArrowRight')
        .toBe(certificatesTab);
      // The app's keyboard focus ring for tabs (styles.scss), in place of
      // Material's focus indicator.
      const tabStyle = getComputedStyle(certificatesTab);
      expect(
        `${tabStyle.borderTopWidth} ${tabStyle.borderTopStyle} ${tabStyle.borderTopColor}`
      )
        .withContext('keyboard focus ring')
        .toBe('1px solid rgb(0, 0, 0)');
      expect(getComputedStyle(certificatesTab, '::before').content)
        .withContext('Material focus indicator')
        .toBe('none');

      pressKey(certificatesTab, 'Enter', ENTER);
      await settle();

      expectPageInTabPanel('Certificates', 'app-certificates');
      expect(certificatesTab.tabIndex).withContext('selected tab').toBe(0);
      expect(generalTab.tabIndex).withContext('other tab').toBe(-1);
    });

    it('should open the focused tab with Space without scrolling the page', async () => {
      const certificatesTab = getTab('Certificates');
      certificatesTab.focus();

      const event = pressKey(certificatesTab, ' ', SPACE);
      await settle();

      expect(event.defaultPrevented)
        .withContext('Space default action (page scroll) prevented')
        .toBeTrue();
      expectPageInTabPanel('Certificates', 'app-certificates');
    });

    it('should keep focus on the selected tab when the app focuses the page after a tab change', async () => {
      const certificatesTab = getTab('Certificates');
      certificatesTab.focus();
      pressKey(certificatesTab, 'Enter', ENTER);
      await settle();

      // After each navigation, AppComponent focuses the first interactive
      // element of the page.
      TestBed.inject(FocusManagerService).focusFirstElementInContainer(
        harness.fixture.nativeElement
      );

      expect(document.activeElement)
        .withContext('focused element')
        .toBe(certificatesTab);
      expectPageInTabPanel('Certificates', 'app-certificates');
    });
  });
});
