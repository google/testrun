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

import { DownloadOptionsComponent } from './download-options.component';
import {
  MOCK_PROGRESS_DATA_CANCELLED,
  MOCK_PROGRESS_DATA_COMPLIANT,
  MOCK_PROGRESS_DATA_NON_COMPLIANT,
} from '../../../../mocks/testrun.mock';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestRunService } from '../../../../services/test-run.service';
import {
  DOWN_ARROW,
  END,
  ENTER,
  ESCAPE,
  HOME,
  SPACE,
  TAB,
  UP_ARROW,
} from '@angular/cdk/keycodes';
import { MatDialogConfig } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { DownloadReportZipComponent } from '../../../../components/download-report-zip/download-report-zip.component';

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

/** Dispatches a keydown like the browser does; CDK key managers read `keyCode`. */
function pressKey(
  target: Element,
  key: string,
  keyCode: number,
  init: KeyboardEventInit = {}
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    keyCode,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

/**
 * Elements that keyboard users can focus but assistive technology cannot
 * perceive (axe `aria-hidden-focus`), e.g. CDK focus trap anchors.
 */
function focusableHiddenElements(root: HTMLElement): string[] {
  return Array.from(
    root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  )
    .filter(element => element.closest('[aria-hidden="true"]'))
    .map(element => element.outerHTML);
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
      providers: [{ provide: TestRunService, useValue: testrunServiceMock }],
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

  describe('Download menu (WAI-ARIA menu button pattern)', () => {
    let compiled: HTMLElement;
    let downloadButton: HTMLButtonElement;

    /** Opens the menu the way users do: by activating "Download". */
    async function openMenu(): Promise<HTMLElement> {
      downloadButton.click();
      fixture.detectChanges();
      await fixture.whenStable();
      return compiled.querySelector('[role="menu"]') as HTMLElement;
    }

    function menuItems(): HTMLElement[] {
      return Array.from(
        compiled.querySelectorAll<HTMLElement>('[role="menu"] > *')
      );
    }

    beforeEach(() => {
      compiled = fixture.nativeElement as HTMLElement;
      downloadButton = compiled.querySelector(
        '.download-button'
      ) as HTMLButtonElement;
    });

    it('should not render a menu while the options are closed', () => {
      expect(compiled.querySelector('[role="menu"]')).toBeNull();
      expect(downloadButton.hasAttribute('aria-controls'))
        .withContext('no reference to a missing menu')
        .toBeFalse();
    });

    it('should keep the "Download" trigger outside the menu it opens', async () => {
      const menu = await openMenu();

      expect(menu.contains(downloadButton)).toBeFalse();
      expect(downloadButton.hasAttribute('role'))
        .withContext('a native button, not a menu item')
        .toBeFalse();
      expect(downloadButton.getAttribute('aria-haspopup')).toBe('menu');
      expect(downloadButton.getAttribute('aria-controls')).toBe(menu.id);
    });

    it('should name the menu by its "Download" trigger', async () => {
      const menu = await openMenu();

      expect(menu.getAttribute('aria-labelledby')).toBe(downloadButton.id);
      expect(accessibleName(menu)).toBe('Download');
    });

    it('should contain only the "PDF Report" and "ZIP File" menu items', async () => {
      await openMenu();

      const items = menuItems();
      expect(items.map(item => item.getAttribute('role'))).toEqual([
        'menuitem',
        'menuitem',
      ]);
      expect(items.map(item => accessibleName(item))).toEqual([
        'Download PDF report',
        'Download ZIP file',
      ]);
    });

    it('should not render focusable elements hidden from assistive technology', async () => {
      await openMenu();

      expect(focusableHiddenElements(compiled)).toEqual([]);
    });

    it('should move focus to the first menu item when the menu opens', async () => {
      await openMenu();

      expect(document.activeElement).toBe(menuItems()[0]);
    });

    it('should move focus between the menu items with the arrow, Home, and End keys', async () => {
      await openMenu();
      const [pdfItem, zipItem] = menuItems();
      pdfItem.focus();

      pressKey(pdfItem, 'ArrowDown', DOWN_ARROW);
      expect(document.activeElement).toBe(zipItem);

      pressKey(zipItem, 'ArrowDown', DOWN_ARROW);
      expect(document.activeElement)
        .withContext('wraps to the first item, skipping "Download"')
        .toBe(pdfItem);

      pressKey(pdfItem, 'ArrowUp', UP_ARROW);
      expect(document.activeElement)
        .withContext('wraps to the last item')
        .toBe(zipItem);

      pressKey(zipItem, 'Home', HOME);
      expect(document.activeElement).toBe(pdfItem);

      pressKey(pdfItem, 'End', END);
      expect(document.activeElement).toBe(zipItem);
    });

    it('should close the menu on Escape and return focus to "Download"', async () => {
      await openMenu();

      pressKey(menuItems()[0], 'Escape', ESCAPE);
      fixture.detectChanges();

      expect(compiled.querySelector('[role="menu"]')).toBeNull();
      expect(downloadButton.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(downloadButton);
    });

    [false, true].forEach(shiftKey => {
      const keys = shiftKey ? 'Shift+Tab' : 'Tab';

      it(`should close the menu on ${keys} without trapping focus`, async () => {
        await openMenu();

        const event = pressKey(menuItems()[1], 'Tab', TAB, { shiftKey });
        fixture.detectChanges();

        expect(compiled.querySelector('[role="menu"]')).toBeNull();
        expect(document.activeElement)
          .withContext('the browser moves focus on from "Download"')
          .toBe(downloadButton);
        expect(event.defaultPrevented)
          .withContext(`${keys} keeps its default action`)
          .toBeFalse();
        expect(focusableHiddenElements(compiled)).toEqual([]);
      });
    });

    it('should close the menu and return focus to "Download" when "PDF Report" is chosen', async () => {
      const downloadPdfSpy = spyOn(component, 'downloadPdf');
      await openMenu();

      menuItems()[0].click();
      fixture.detectChanges();

      expect(downloadPdfSpy).toHaveBeenCalledOnceWith(
        MOCK_PROGRESS_DATA_COMPLIANT
      );
      expect(compiled.querySelector('[role="menu"]')).toBeNull();
      expect(document.activeElement).toBe(downloadButton);
    });

    describe('"ZIP File" menu item', () => {
      let dialogOpenSpy: jasmine.Spy;

      beforeEach(async () => {
        await openMenu();
        const zipItem = fixture.debugElement.query(
          By.directive(DownloadReportZipComponent)
        ).componentInstance as DownloadReportZipComponent;
        dialogOpenSpy = spyOn(zipItem.dialog, 'open');
      });

      [
        { name: 'a click', activate: (item: HTMLElement) => item.click() },
        {
          name: 'Enter',
          activate: (item: HTMLElement) => pressKey(item, 'Enter', ENTER),
        },
        {
          name: 'Space',
          activate: (item: HTMLElement) => pressKey(item, ' ', SPACE),
        },
      ].forEach(({ name, activate }) => {
        it(`should close the menu when ${name} opens the ZIP dialog, leaving no focus trap`, () => {
          activate(menuItems()[1]);
          fixture.detectChanges();

          expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
          expect(compiled.querySelector('[role="menu"]')).toBeNull();
          expect(downloadButton.getAttribute('aria-expanded')).toBe('false');
          expect(focusableHiddenElements(compiled)).toEqual([]);
        });
      });

      it('should return focus to "Download" when the ZIP dialog closes', () => {
        menuItems()[1].click();
        fixture.detectChanges();

        const { restoreFocus } = dialogOpenSpy.calls.mostRecent()
          .args[1] as MatDialogConfig;
        expect(
          typeof restoreFocus === 'string'
            ? document.querySelector(restoreFocus)
            : restoreFocus
        )
          .withContext('the closed menu item can no longer take focus')
          .toBe(downloadButton);
      });
    });
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
