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
  flush,
  TestBed,
} from '@angular/core/testing';

import { DownloadOptionsComponent } from './download-options.component';
import {
  MOCK_PROGRESS_DATA_CANCELLED,
  MOCK_PROGRESS_DATA_COMPLIANT,
  MOCK_PROGRESS_DATA_NON_COMPLIANT,
} from '../../../../mocks/testrun.mock';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestRunService } from '../../../../services/test-run.service';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';

interface GAEvent {
  event: string;
}

/** Collapses whitespace the way the accessible name computation does. */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Text of a subtree as assistive technology reads it: skips `aria-hidden` and
 * CSS-hidden nodes. With `visibleOnly`, it also skips visually hidden text
 * (clipped to 1 x 1 px), so it returns only what sighted users read.
 */
function textOf(node: Node, visibleOnly = false): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (
    !(node instanceof HTMLElement) ||
    node.getAttribute('aria-hidden') === 'true'
  ) {
    return '';
  }
  const { display, visibility } = getComputedStyle(node);
  const { width, height } = node.getBoundingClientRect();
  if (
    display === 'none' ||
    visibility === 'hidden' ||
    (visibleOnly && width <= 1 && height <= 1)
  ) {
    return '';
  }
  return Array.from(node.childNodes, child => textOf(child, visibleOnly)).join(
    ''
  );
}

/** Text of the elements referenced by an `aria-labelledby`/`aria-describedby` value. */
function textOfIdRefs(idRefs: string | null): string {
  return (idRefs ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => {
      const element = document.getElementById(id);
      return element ? textOf(element) : '';
    })
    .join(' ');
}

/** Accessible name of a control named by ARIA attributes or its content. */
function accessibleName(element: HTMLElement): string {
  const labelledBy = element.getAttribute('aria-labelledby');
  return normalizeWhitespace(
    labelledBy
      ? textOfIdRefs(labelledBy)
      : element.getAttribute('aria-label') || textOf(element)
  );
}

/** Text label that sighted users see on a control. */
function visibleLabel(element: HTMLElement): string {
  return normalizeWhitespace(textOf(element, true));
}

/** Whether keyboard users can reach the element with Tab. */
function isTabbable(element: Element): boolean {
  return (
    element instanceof HTMLElement &&
    element.tabIndex >= 0 &&
    !element.hasAttribute('disabled')
  );
}

/**
 * `aria-hidden` elements that are, or contain, Tab stops: keyboard users reach
 * them, but screen readers cannot announce them (axe `aria-hidden-focus`).
 */
function focusableHiddenElements(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('[aria-hidden="true"]'))
    .filter(hidden =>
      [hidden, ...Array.from(hidden.querySelectorAll('*'))].some(isTabbable)
    )
    .map(hidden => hidden.outerHTML);
}

/**
 * Roles of the elements a container owns, as axe `aria-required-children`
 * sees them: its nearest descendants with a role. A `<button>` without a
 * `role` attribute counts as a button.
 */
function ownedRoles(container: Element): string[] {
  return Array.from(container.children).flatMap(child => {
    const role =
      child.getAttribute('role') ??
      (child.tagName === 'BUTTON' ? 'button' : null);
    return role ? [role] : ownedRoles(child);
  });
}

describe('DownloadOptionsComponent', () => {
  let component: DownloadOptionsComponent;
  let fixture: ComponentFixture<DownloadOptionsComponent>;
  const testrunServiceMock: jasmine.SpyObj<TestRunService> =
    jasmine.createSpyObj('testrunServiceMock', ['downloadZip']);

  beforeEach(async () => {
    // @ts-expect-error data layer should be defined
    window.dataLayer = window.dataLayer || [];
    await TestBed.configureTestingModule({
      imports: [DownloadOptionsComponent, NoopAnimationsModule],
      providers: [
        { provide: TestRunService, useValue: testrunServiceMock },
        // The "Download ZIP file" dialog can navigate to Risk Assessment.
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DownloadOptionsComponent);
    component = fixture.componentInstance;
    component.data = MOCK_PROGRESS_DATA_COMPLIANT;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have download zip component', () => {
    const downloadReportZipComponent = fixture.nativeElement.querySelector(
      'app-download-report-zip'
    );

    expect(downloadReportZipComponent).toBeDefined();
  });

  it('#downloadPdf should call getReportTitle', () => {
    const spyGetReportTitle = spyOn(component, 'getReportTitle');
    // Use a fake link: clicking a real target="_blank" link opens a new tab,
    // which takes focus away from the test page and breaks later specs that
    // check focus styles.
    const link = jasmine.createSpyObj<HTMLAnchorElement>('a', [
      'dispatchEvent',
    ]);
    spyOn(document, 'createElement').and.returnValue(link);

    component.downloadPdf(MOCK_PROGRESS_DATA_COMPLIANT);

    expect(spyGetReportTitle).toHaveBeenCalled();
    expect(link.dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it('#getReportTitle should return data for title of link', () => {
    const expectedResult = 'delta_03-din-cpu_1.2.2_complete_22_jun_2023_9:20';

    const result = component.getReportTitle(MOCK_PROGRESS_DATA_COMPLIANT);

    expect(result).toEqual(expectedResult);
  });

  it('#openDownloadOptions should change isOpenDownloadOptions', () => {
    component.openDownloadOptions();
    expect(component.isOpenDownloadOptions).toBeTrue();

    component.openDownloadOptions();
    expect(component.isOpenDownloadOptions).toBeFalse();
  });

  it('#handleKeydown should close download options on Escape key', () => {
    component.openDownloadOptions();
    expect(component.isOpenDownloadOptions).toBeTrue();

    component.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.isOpenDownloadOptions).toBeFalse();
  });

  describe('"Download" button (WCAG 2.5.3 Label in Name)', () => {
    let downloadButton: HTMLButtonElement;

    beforeEach(() => {
      downloadButton = fixture.nativeElement.querySelector(
        '.download-button'
      ) as HTMLButtonElement;
    });

    it('should be named by its visible text while the options are closed', () => {
      expect(visibleLabel(downloadButton)).toBe('Download');
      expect(accessibleName(downloadButton)).toBe('Download');
      expect(downloadButton.hasAttribute('aria-label'))
        .withContext('an aria-label overrides the visible text')
        .toBeFalse();
      expect(downloadButton.getAttribute('aria-haspopup')).toBe('menu');
      expect(downloadButton.getAttribute('aria-expanded')).toBe('false');
    });

    it('should keep its name and report the open state when it shows only a close icon', () => {
      downloadButton.click();
      fixture.detectChanges();

      expect(visibleLabel(downloadButton))
        .withContext('the open options show only a close icon')
        .toBe('');
      expect(accessibleName(downloadButton)).toBe('Download');
      expect(downloadButton.hasAttribute('aria-label')).toBeFalse();
      expect(downloadButton.getAttribute('aria-expanded')).toBe('true');
      expect(
        downloadButton.querySelector('mat-icon')?.getAttribute('aria-hidden')
      ).toBe('true');
    });

    it('should show its visible text again when Escape closes the options', () => {
      downloadButton.click();
      fixture.detectChanges();

      downloadButton.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
      fixture.detectChanges();

      expect(visibleLabel(downloadButton)).toBe('Download');
      expect(accessibleName(downloadButton)).toBe('Download');
      expect(downloadButton.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('"Download" menu (WAI-ARIA menu button pattern)', () => {
    let compiled: HTMLElement;
    let downloadButton: HTMLButtonElement;

    /** Presses a key as Angular (`key`) and the CDK key manager (`keyCode`) read it. */
    function pressKey(
      target: Element,
      key: string,
      keyCode: number,
      shiftKey = false
    ): void {
      target.dispatchEvent(
        new KeyboardEvent('keydown', { key, keyCode, shiftKey, bubbles: true })
      );
      fixture.detectChanges();
    }

    /** Opens the options with the "Download" button and returns the menu. */
    function openMenu(): HTMLElement {
      downloadButton.click();
      fixture.detectChanges();
      return compiled.querySelector('[role="menu"]') as HTMLElement;
    }

    /** The "PDF Report" and "ZIP File" options, in order. */
    function options(): HTMLElement[] {
      return Array.from(
        compiled.querySelectorAll<HTMLElement>('.download-option')
      );
    }

    beforeEach(() => {
      compiled = fixture.nativeElement as HTMLElement;
      downloadButton = compiled.querySelector(
        '.download-button'
      ) as HTMLButtonElement;
    });

    it('should not expose a menu while the options are closed', () => {
      expect(compiled.querySelector('[role="menu"]')).toBeNull();
      expect(downloadButton.getAttribute('aria-expanded')).toBe('false');
      expect(downloadButton.hasAttribute('aria-controls')).toBeFalse();
    });

    it('should keep the "Download" button outside the menu it opens and name the menu by it', () => {
      const menu = openMenu();

      expect(menu.contains(downloadButton)).toBeFalse();
      expect(downloadButton.hasAttribute('role'))
        .withContext('a native button, not a menu item')
        .toBeFalse();
      expect(downloadButton.getAttribute('aria-haspopup')).toBe('menu');
      expect(downloadButton.getAttribute('aria-expanded')).toBe('true');
      expect(menu.id).toBeTruthy();
      expect(downloadButton.getAttribute('aria-controls')).toBe(menu.id);
      expect(accessibleName(menu)).toBe('Download');
    });

    it('should contain only menu items in the menu', () => {
      const menu = openMenu();

      expect(ownedRoles(menu)).toEqual(['menuitem', 'menuitem']);
      expect(options().map(option => accessibleName(option))).toEqual([
        'Download PDF report',
        'Download ZIP file',
      ]);
    });

    it('should not hide Tab stops from assistive technology', () => {
      openMenu();
      expect(focusableHiddenElements(compiled))
        .withContext('options open')
        .toEqual([]);

      pressKey(options()[0], 'Escape', 27);
      expect(focusableHiddenElements(compiled))
        .withContext('options closed')
        .toEqual([]);
    });

    it('should let Tab leave the menu instead of trapping focus in it', () => {
      openMenu();
      const tabStops = Array.from(compiled.querySelectorAll('*')).filter(
        isTabbable
      ) as HTMLElement[];

      expect(tabStops.map(tabStop => accessibleName(tabStop)))
        .withContext('Tab stops in visual order, top to bottom')
        .toEqual(['Download PDF report', 'Download ZIP file', 'Download']);
      for (const tabStop of tabStops) {
        tabStop.focus();
        expect(document.activeElement)
          .withContext(`focus is not redirected from ${tabStop.outerHTML}`)
          .toBe(tabStop);
      }
    });

    it('should move focus to the first menu item when the menu opens', () => {
      openMenu();

      expect(document.activeElement).toBe(options()[0]);
    });

    it('should move focus between the menu items with the arrow keys', () => {
      openMenu();
      const [pdfOption, zipOption] = options();
      pdfOption.focus();

      pressKey(pdfOption, 'ArrowDown', 40);
      expect(document.activeElement).toBe(zipOption);

      pressKey(zipOption, 'ArrowDown', 40);
      expect(document.activeElement)
        .withContext('wraps to the first item')
        .toBe(pdfOption);

      pressKey(pdfOption, 'ArrowUp', 38);
      expect(document.activeElement)
        .withContext('wraps to the last item')
        .toBe(zipOption);
    });

    it('should close on Escape and return focus to the "Download" button', () => {
      openMenu();
      const zipOption = options()[1];
      zipOption.focus();

      pressKey(zipOption, 'Escape', 27);

      expect(compiled.querySelector('[role="menu"]')).toBeNull();
      expect(downloadButton.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(downloadButton);
    });

    it('should close on Tab and Shift+Tab and move focus to the "Download" button, so Tab continues from it', () => {
      for (const shiftKey of [false, true]) {
        openMenu();
        const pdfOption = options()[0];
        pdfOption.focus();

        pressKey(pdfOption, 'Tab', 9, shiftKey);

        expect(compiled.querySelector('[role="menu"]'))
          .withContext(`menu after Tab (shiftKey: ${shiftKey})`)
          .toBeNull();
        expect(document.activeElement)
          .withContext(`focus after Tab (shiftKey: ${shiftKey})`)
          .toBe(downloadButton);
      }
    });

    it('should close and return focus to the "Download" button when "PDF Report" is chosen', () => {
      // A real download opens a new tab, which takes focus from the test page.
      const downloadPdfSpy = spyOn(component, 'downloadPdf');
      openMenu();

      options()[0].click();
      fixture.detectChanges();

      expect(downloadPdfSpy).toHaveBeenCalledOnceWith(
        MOCK_PROGRESS_DATA_COMPLIANT
      );
      expect(compiled.querySelector('[role="menu"]')).toBeNull();
      expect(downloadButton.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(downloadButton);
    });

    it('should close when "ZIP File" is chosen and return focus to the "Download" button after its dialog closes', fakeAsync(() => {
      const dialog = TestBed.inject(MatDialog);
      openMenu();
      const zipOption = options()[1];
      zipOption.focus();

      pressKey(zipOption, 'Enter', 13);
      flush();

      expect(compiled.querySelector('[role="menu"]'))
        .withContext('choosing an option closes the menu')
        .toBeNull();
      expect(dialog.openDialogs.length).toBe(1);
      expect(
        document
          .querySelector('mat-dialog-container')
          ?.contains(document.activeElement)
      )
        .withContext('focus moves into the dialog')
        .toBeTrue();

      (
        document.querySelector(
          'app-download-zip-modal .cancel-button'
        ) as HTMLButtonElement
      ).click();
      fixture.detectChanges();
      flush();

      expect(dialog.openDialogs.length).toBe(0);
      expect(document.activeElement)
        .withContext('the dialog returns focus to the element focused at open')
        .toBe(downloadButton);
      expect(focusableHiddenElements(compiled)).toEqual([]);
    }));
  });

  describe('#sendGAEvent', () => {
    it('should send download_report_pdf when type is pdf', () => {
      component.sendGAEvent(MOCK_PROGRESS_DATA_CANCELLED);

      expect(
        // @ts-expect-error data layer should be defined
        window.dataLayer.some(
          (item: GAEvent) => item.event === 'download_report_pdf'
        )
      ).toBeTruthy();
    });

    it('should send download_report_pdf_compliant when status is compliant', () => {
      component.sendGAEvent(MOCK_PROGRESS_DATA_COMPLIANT);

      expect(
        // @ts-expect-error data layer should be defined
        window.dataLayer.some(
          (item: GAEvent) => item.event === 'download_report_pdf_compliant'
        )
      ).toBeTruthy();
    });

    it('should send download_report_pdf_non_compliant when status is not compliant', () => {
      component.sendGAEvent(MOCK_PROGRESS_DATA_NON_COMPLIANT);

      expect(
        // @ts-expect-error data layer should be defined
        window.dataLayer.some(
          (item: GAEvent) => item.event === 'download_report_pdf_non_compliant'
        )
      ).toBeTruthy();
    });
  });
});
