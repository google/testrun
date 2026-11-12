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
import { Component } from '@angular/core';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatButtonHarness } from '@angular/material/button/testing';

import { DownloadReportComponent } from './download-report.component';
import {
  MOCK_PROGRESS_DATA_CANCELLED,
  MOCK_PROGRESS_DATA_COMPLIANT,
  MOCK_PROGRESS_DATA_NON_COMPLIANT,
} from '../../mocks/testrun.mock';
import { TestrunStatus } from '../../model/testrun-status';

describe('DownloadReportComponent', () => {
  let component: DownloadReportComponent;
  let fixture: ComponentFixture<DownloadReportComponent>;

  describe('Class tests', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [DownloadReportComponent],
      });
      fixture = TestBed.createComponent(DownloadReportComponent);
      component = fixture.componentInstance;
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('#getReportTitle', () => {
      it('should return data for download property of link', () => {
        const expectedResult =
          'delta_03-din-cpu_1.2.2_compliant_22_jun_2023_9:20';

        const result = component.getReportTitle(MOCK_PROGRESS_DATA_COMPLIANT);

        expect(result).toEqual(expectedResult);
      });

      it('should return empty string if no device data', () => {
        const MOCK_DATA_WITHOUT_DEVICE = {
          ...MOCK_PROGRESS_DATA_COMPLIANT,
          device: undefined as unknown,
        } as TestrunStatus;

        const result = component.getReportTitle(MOCK_DATA_WITHOUT_DEVICE);

        expect(result).toEqual('');
      });
    });

    describe('#getClass', () => {
      beforeEach(() => {
        component.class = 'class';
      });

      it('should return class with -compliant if status is Compliant', () => {
        const expectedResult = 'class-compliant';

        const result = component.getClass(MOCK_PROGRESS_DATA_COMPLIANT);

        expect(result).toEqual(expectedResult);
      });

      it('should return class with -non-compliant if status is Non Compliant', () => {
        const expectedResult = 'class-non-compliant';

        const result = component.getClass(MOCK_PROGRESS_DATA_NON_COMPLIANT);

        expect(result).toEqual(expectedResult);
      });

      it('should return class if status is not Compliant and Non-compliant', () => {
        const expectedResult = 'class';

        const result = component.getClass(MOCK_PROGRESS_DATA_CANCELLED);

        expect(result).toEqual(expectedResult);
      });
    });
  });

  describe('DOM tests', () => {
    let compiled: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [DownloadReportComponent],
      }).compileComponents();
      fixture = TestBed.createComponent(DownloadReportComponent);
      compiled = fixture.nativeElement as HTMLElement;
      component = fixture.componentInstance;
    });

    describe('with not data provided', () => {
      beforeEach(() => {
        (component.data as unknown) = null;
        fixture.detectChanges();
      });

      it('should not have content', () => {
        const downloadReportLink = compiled.querySelector(
          '.download-report-link'
        );

        expect(downloadReportLink).toBeNull();
      });
    });

    describe('with data provided', () => {
      beforeEach(() => {
        component.data = MOCK_PROGRESS_DATA_COMPLIANT;
        component.title =
          'Download pdf for Testrun # Delta 03-DIN-CPU 1.2.2 22 Jun 2023 9:20';
        component.href = MOCK_PROGRESS_DATA_COMPLIANT.report;

        fixture.detectChanges();
      });

      it('should have download report link', () => {
        const downloadReportLink = compiled.querySelector(
          '.download-report-link'
        ) as HTMLAnchorElement;

        expect(downloadReportLink).not.toBeNull();
        expect(downloadReportLink.href).toContain('/report/123');
        expect(downloadReportLink.download).toEqual(
          'delta_03-din-cpu_1.2.2_compliant_22_jun_2023_9:20'
        );
      });

      it('should name the link by its title instead of the report file name', () => {
        const downloadReportLink = compiled.querySelector(
          '.download-report-link'
        ) as HTMLAnchorElement;

        expect(downloadReportLink.getAttribute('aria-label')).toBe(
          'Download pdf for Testrun # Delta 03-DIN-CPU 1.2.2 22 Jun 2023 9:20'
        );
      });

      it('should not repeat the name as a tooltip description', async () => {
        await fixture.whenStable();

        const downloadReportLink = compiled.querySelector(
          '.download-report-link'
        ) as HTMLAnchorElement;

        expect(downloadReportLink.hasAttribute('aria-describedby')).toBeFalse();
      });
    });
  });

  describe('as a text button', () => {
    let hostFixture: ComponentFixture<TextButtonHostComponent>;
    let link: HTMLAnchorElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TextButtonHostComponent],
      }).compileComponents();
      hostFixture = TestBed.createComponent(TextButtonHostComponent);
      hostFixture.detectChanges();
      await hostFixture.whenStable();
      link = (hostFixture.nativeElement as HTMLElement).querySelector(
        'app-download-report a'
      ) as HTMLAnchorElement;
    });

    it('should render a focusable link named by its projected text', () => {
      expect(link.textContent?.trim()).toBe('Download PDF report');
      expect(link.hasAttribute('aria-label')).toBeFalse();
      expect(link.hasAttribute('aria-describedby')).toBeFalse();
      expect(link.tabIndex).toBe(0);
      expect(link.getAttribute('href')).toBe('/report/123');
      expect(link.download).toBe(
        'delta_03-din-cpu_1.2.2_compliant_22_jun_2023_9:20'
      );
    });

    it('should style the link itself as a Material text button', async () => {
      const button = await TestbedHarnessEnvironment.loader(
        hostFixture
      ).getHarness(MatButtonHarness.with({ text: 'Download PDF report' }));

      expect(await (await button.host()).getProperty('tagName')).toBe('A');
      expect(await button.getAppearance()).toBe('text');
    });
  });
});

@Component({
  template: `
    <app-download-report textButton [data]="data" [href]="data.report">
      Download PDF report
    </app-download-report>
  `,
  imports: [DownloadReportComponent],
})
class TextButtonHostComponent {
  data = MOCK_PROGRESS_DATA_COMPLIANT;
}
