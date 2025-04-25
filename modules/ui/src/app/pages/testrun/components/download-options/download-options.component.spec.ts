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

    component.downloadPdf(MOCK_PROGRESS_DATA_COMPLIANT);

    expect(spyGetReportTitle).toHaveBeenCalled();
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
