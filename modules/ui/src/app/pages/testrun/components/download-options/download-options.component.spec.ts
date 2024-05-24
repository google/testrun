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

import {
  DownloadOption,
  DownloadOptionsComponent,
} from './download-options.component';
import {
  MOCK_PROGRESS_DATA_CANCELLED,
  MOCK_PROGRESS_DATA_COMPLIANT,
  MOCK_PROGRESS_DATA_NON_COMPLIANT,
} from '../../../../mocks/testrun.mock';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatOptionSelectionChange } from '@angular/material/core';

interface GAEvent {
  event: string;
}
describe('DownloadOptionsComponent', () => {
  let component: DownloadOptionsComponent;
  let fixture: ComponentFixture<DownloadOptionsComponent>;

  beforeEach(async () => {
    // @ts-expect-error data layer should be defined
    window.dataLayer = window.dataLayer || [];
    await TestBed.configureTestingModule({
      imports: [DownloadOptionsComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DownloadOptionsComponent);
    component = fixture.componentInstance;
    component.data = MOCK_PROGRESS_DATA_COMPLIANT;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('#onSelected should call getReportTitle', () => {
    const spyGetReportTitle = spyOn(component, 'getReportTitle');

    const mockEvent = {
      source: {},
      isUserInput: true,
    } as MatOptionSelectionChange;

    component.onSelected(
      mockEvent,
      MOCK_PROGRESS_DATA_COMPLIANT,
      DownloadOption.PDF
    );

    expect(spyGetReportTitle).toHaveBeenCalled();
  });

  it('#onSelected should call getZipLink when using for zip report', () => {
    const spyGetZipLink = spyOn(component, 'getZipLink');

    const mockEvent = {
      source: {},
      isUserInput: true,
    } as MatOptionSelectionChange;

    component.onSelected(
      mockEvent,
      MOCK_PROGRESS_DATA_COMPLIANT,
      DownloadOption.ZIP
    );

    expect(spyGetZipLink).toHaveBeenCalled();
  });

  describe('#sendGAEvent', () => {
    it('should send download_report_pdf when type is pdf', () => {
      component.sendGAEvent(MOCK_PROGRESS_DATA_CANCELLED, DownloadOption.PDF);

      expect(
        // @ts-expect-error data layer should be defined
        window.dataLayer.some(
          (item: GAEvent) => item.event === 'download_report_pdf'
        )
      ).toBeTruthy();
    });

    it('should send download_report_pdf_compliant when type is pdf and status is compliant', () => {
      component.sendGAEvent(MOCK_PROGRESS_DATA_COMPLIANT, DownloadOption.PDF);

      expect(
        // @ts-expect-error data layer should be defined
        window.dataLayer.some(
          (item: GAEvent) => item.event === 'download_report_pdf_compliant'
        )
      ).toBeTruthy();
    });

    it('should send download_report_pdf_non_compliant when type is pdf and status is not compliant', () => {
      component.sendGAEvent(
        MOCK_PROGRESS_DATA_NON_COMPLIANT,
        DownloadOption.PDF
      );

      expect(
        // @ts-expect-error data layer should be defined
        window.dataLayer.some(
          (item: GAEvent) => item.event === 'download_report_pdf_non_compliant'
        )
      ).toBeTruthy();
    });

    it('should send download_report_zip when type is zip', () => {
      component.sendGAEvent(MOCK_PROGRESS_DATA_CANCELLED, DownloadOption.ZIP);

      expect(
        // @ts-expect-error data layer should be defined
        window.dataLayer.some(
          (item: GAEvent) => item.event === 'download_report_zip'
        )
      ).toBeTruthy();
    });

    it('should send download_report_zip_compliant when type is pdf and status is compliant', () => {
      component.sendGAEvent(MOCK_PROGRESS_DATA_COMPLIANT, DownloadOption.ZIP);

      expect(
        // @ts-expect-error data layer should be defined
        window.dataLayer.some(
          (item: GAEvent) => item.event === 'download_report_zip_compliant'
        )
      ).toBeTruthy();
    });

    it('should send download_report_zip_non_compliant when type is zip and status is not compliant', () => {
      component.sendGAEvent(
        MOCK_PROGRESS_DATA_NON_COMPLIANT,
        DownloadOption.ZIP
      );

      expect(
        // @ts-expect-error data layer should be defined
        window.dataLayer.some(
          (item: GAEvent) => item.event === 'download_report_zip_non_compliant'
        )
      ).toBeTruthy();
    });
  });
});
