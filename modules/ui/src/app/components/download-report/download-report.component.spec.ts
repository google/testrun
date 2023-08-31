import {ComponentFixture, TestBed} from '@angular/core/testing';

import {DownloadReportComponent} from './download-report.component';
import {MOCK_PROGRESS_DATA_COMPLIANT} from '../../mocks/progress.mock';

describe('DownloadReportComponent', () => {
  let component: DownloadReportComponent;
  let fixture: ComponentFixture<DownloadReportComponent>;

  describe('Class tests', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [DownloadReportComponent]
      });
      fixture = TestBed.createComponent(DownloadReportComponent);
      component = fixture.componentInstance;
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('#getTestRunId should return data for title of link', () => {
      const expectedResult = 'Delta 03-DIN-CPU 1.2.2 22 Jun 2023 9:20';

      const result = component.getTestRunId(MOCK_PROGRESS_DATA_COMPLIANT);

      expect(result).toEqual(expectedResult);
    });

    it('#getReportTitle should return data for download property of link', () => {
      const expectedResult = 'delta_03-din-cpu_1.2.2_compliant_22_jun_2023_9:20';

      const result = component.getReportTitle(MOCK_PROGRESS_DATA_COMPLIANT);

      expect(result).toEqual(expectedResult);
    });

    it('#getFormattedDateString should return date as string in the format "d MMM y H:mm"', () => {
      const expectedResult = '22 Jun 2023 9:20';

      const result = component.getFormattedDateString(MOCK_PROGRESS_DATA_COMPLIANT.started);

      expect(result).toEqual(expectedResult);
    });

    it('#getFormattedDateString should return empty string when no date', () => {
      const expectedResult = '';

      const result = component.getFormattedDateString(null);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('DOM tests', () => {
    let compiled: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [DownloadReportComponent]
      }).compileComponents();
      fixture = TestBed.createComponent(DownloadReportComponent);
      compiled = fixture.nativeElement as HTMLElement;
      component = fixture.componentInstance;
    });

    describe('with not data provided', () => {
      beforeEach(() => {
        (component.data as any) = null;
        fixture.detectChanges();
      });

      it('should not have content', () => {
        const downloadReportLink = compiled.querySelector('.download-report-link');

        expect(downloadReportLink).toBeNull();
      });
    });

    describe('with data provided', () => {
      beforeEach(() => {
        (component.data) = MOCK_PROGRESS_DATA_COMPLIANT;
        fixture.detectChanges();
      });

      it('should have download report link', () => {
        const downloadReportLink = compiled.querySelector('.download-report-link') as HTMLAnchorElement;

        expect(downloadReportLink).not.toBeNull();
        expect(downloadReportLink.href).toEqual('https://api.testrun.io/report.pdf');
        expect(downloadReportLink.download).toEqual('delta_03-din-cpu_1.2.2_compliant_22_jun_2023_9:20');
        expect(downloadReportLink.title).toEqual('Download report for Test Run # Delta 03-DIN-CPU 1.2.2 22 Jun 2023 9:20');
      });
    });
  });

});
