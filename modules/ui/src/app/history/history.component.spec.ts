import {ComponentFixture, TestBed} from '@angular/core/testing';

import {HistoryComponent} from './history.component';
import {TestRunService} from '../test-run.service';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {HistoryModule} from './history.module';
import {of} from 'rxjs';
import {TestrunStatus} from '../model/testrun-status';
import SpyObj = jasmine.SpyObj;

const history = [{
  "status": "compliant",
  "device": {
    "manufacturer": "Delta",
    "model": "03-DIN-SRC",
    "mac_addr": "01:02:03:04:05:06",
    "firmware": "1.2.2"
  },
  "report": "https://api.testrun.io/report.pdf",
  "started": "2023-06-23T10:11:00.123Z",
  "finished": "2023-06-23T10:17:00.123Z"
}] as TestrunStatus[];

describe('HistoryComponent', () => {
  let component: HistoryComponent;
  let fixture: ComponentFixture<HistoryComponent>;
  let compiled: HTMLElement;
  let mockService: SpyObj<TestRunService>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj(['fetchHistory', 'getHistory', 'getResultClass']);
    TestBed.configureTestingModule({
      imports: [HistoryModule, BrowserAnimationsModule],
      providers: [{provide: TestRunService, useValue: mockService}],
      declarations: [HistoryComponent]
    });
    fixture = TestBed.createComponent(HistoryComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  describe('Class tests', () => {
    beforeEach(() => {
      mockService.getHistory.and.returnValue(of(history));
    })

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should set history value', () => {
      component.ngOnInit();

      component.history$.subscribe(res => {
        expect(res).toEqual(history)
      })
    });
  });

  describe('DOM tests', () => {
    describe('with no devices', () => {
      beforeEach(() => {
        mockService.getHistory.and.returnValue(of([]));
        fixture.detectChanges();
      })

      it('should have empty message', () => {
        const empty = compiled.querySelector('.results-content-empty');
        expect(empty).toBeTruthy();
      });
    });

    describe('with devices', () => {
      beforeEach(() => {
        mockService.getHistory.and.returnValue(of(history));
        mockService.getResultClass.and.returnValue({green: false, red: true, grey: false});
        component.ngOnInit();
        fixture.detectChanges();
      })

      it('should have data table', () => {
        const table = compiled.querySelector('table');

        expect(table).toBeTruthy();
      });

      it('should have addition valid class on table cell "Status"', () => {
        const statusResultEl = compiled.querySelector('.table-cell-result-text');

        expect(statusResultEl?.classList).toContain('red');
      });

      it('should have report link', () => {
        const link = compiled.querySelector('.download-report-link') as HTMLAnchorElement;

        expect(link.href).toEqual('https://api.testrun.io/report.pdf');
        expect(link.download).toEqual('delta_03-din-src_1.2.2_compliant_23_jun_2023_10:11');
        expect(link.title).toEqual('Download report for Test Run # Delta 03-DIN-SRC 1.2.2 23 Jun 2023 10:11');
      });
    });
  });
});
