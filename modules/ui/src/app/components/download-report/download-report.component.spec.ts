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

import { DownloadReportComponent } from './download-report.component';
import {
  MOCK_PROGRESS_DATA_CANCELLED,
  MOCK_PROGRESS_DATA_COMPLIANT,
  MOCK_PROGRESS_DATA_NON_COMPLIANT,
} from '../../mocks/progress.mock';

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

    it('#getReportTitle should return data for download property of link', () => {
      const expectedResult =
        'delta_03-din-cpu_1.2.2_compliant_22_jun_2023_9:20';

      const result = component.getReportTitle(MOCK_PROGRESS_DATA_COMPLIANT);

      expect(result).toEqual(expectedResult);
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
        expect(downloadReportLink.href).toEqual(
          'https://api.testrun.io/report.pdf'
        );
        expect(downloadReportLink.download).toEqual(
          'delta_03-din-cpu_1.2.2_compliant_22_jun_2023_9:20'
        );
      });
    });
  });
});
