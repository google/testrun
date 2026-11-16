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
    .map(id => document.getElementById(id)?.textContent?.trim() ?? '')
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
