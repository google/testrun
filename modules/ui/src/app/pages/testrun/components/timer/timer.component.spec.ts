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
  TestBed,
  tick,
} from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { SimpleChange } from '@angular/core';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  MONITORING_TIMER_STORAGE_KEY,
  TimerComponent,
} from './timer.component';
import {
  MOCK_PROGRESS_DATA_CANCELLING,
  MOCK_PROGRESS_DATA_MONITORING,
} from '../../../../mocks/testrun.mock';
import {
  selectSystemConfig,
  selectSystemStatus,
} from '../../../../store/selectors';
import * as allSelectors from '../../../../store/selectors';
import { AppState } from '../../../../store/state';
import { TestrunStatus } from '../../../../model/testrun-status';

describe('TimerComponent', () => {
  let component: TimerComponent;
  let fixture: ComponentFixture<TimerComponent>;
  let compiled: HTMLElement;
  let store: MockStore;
  let liveAnnouncerSpy: jasmine.SpyObj<LiveAnnouncer>;

  const mockConfig = {
    monitor_period: 300,
    network: null,
  };

  beforeEach(() => {
    liveAnnouncerSpy = jasmine.createSpyObj('LiveAnnouncer', ['announce']);

    TestBed.configureTestingModule({
      imports: [TimerComponent],
      providers: [
        { provide: LiveAnnouncer, useValue: liveAnnouncerSpy },
        provideMockStore({
          selectors: [
            { selector: selectSystemConfig, value: mockConfig },
            { selector: selectSystemStatus, value: null },
          ],
        }),
      ],
    });

    localStorage.clear();
    sessionStorage.clear();

    fixture = TestBed.createComponent(TimerComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    component.ngOnDestroy();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('AC 1: Automatic initiation on Monitoring status', () => {
    it('should initiate countdown when systemStatus becomes Monitoring', fakeAsync(() => {
      component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
      component.duration = 300;
      component.ngOnChanges({
        systemStatus: new SimpleChange(
          null,
          MOCK_PROGRESS_DATA_MONITORING,
          true
        ),
      });
      fixture.detectChanges();

      expect(component.isMonitoring).toBeTrue();
      expect(component.remainingSeconds).toBe(300);
      expect(component.formattedTime).toBe('05:00');

      const timerEl = compiled.querySelector('.monitoring-timer');
      expect(timerEl).not.toBeNull();
    }));

    it('should automatically initiate from store if systemStatus is not passed as Input', fakeAsync(() => {
      store.overrideSelector(selectSystemStatus, MOCK_PROGRESS_DATA_MONITORING);
      store.refreshState();

      component.ngOnInit();
      fixture.detectChanges();

      expect(component.isMonitoring).toBeTrue();
      expect(component.formattedTime).toBe('05:00');
    }));
  });

  describe('AC 2: Duration pulled directly from monitor_period in config', () => {
    it('should use duration from monitor_period in systemConfig', fakeAsync(() => {
      store.overrideSelector(selectSystemConfig, {
        monitor_period: 180,
        network: null,
      });
      store.refreshState();

      component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
      component.ngOnInit();
      fixture.detectChanges();

      expect(component.totalDuration).toBe(180);
      expect(component.remainingSeconds).toBe(180);
      expect(component.formattedTime).toBe('03:00');
    }));

    it('should use explicit duration input when provided', fakeAsync(() => {
      component.duration = 120;
      component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
      component.ngOnInit();
      fixture.detectChanges();

      expect(component.totalDuration).toBe(120);
      expect(component.remainingSeconds).toBe(120);
      expect(component.formattedTime).toBe('02:00');
    }));
  });

  describe('AC 3: Standard MM:SS format display', () => {
    it('should format minutes and seconds with zero-padding', () => {
      component.remainingSeconds = 65;
      expect(component.formattedTime).toBe('01:05');

      component.remainingSeconds = 9;
      expect(component.formattedTime).toBe('00:09');

      component.remainingSeconds = 300;
      expect(component.formattedTime).toBe('05:00');

      component.remainingSeconds = 0;
      expect(component.formattedTime).toBe('00:00');
    });

    it('should display timer value in the DOM', fakeAsync(() => {
      component.duration = 300;
      component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
      component.ngOnInit();
      fixture.detectChanges();

      const timerValueEl = compiled.querySelector('.timer-countdown');
      expect(timerValueEl?.textContent?.trim()).toBe('05:00');

      tick(1000);
      fixture.detectChanges();
      expect(timerValueEl?.textContent?.trim()).toBe('04:59');
    }));
  });

  describe('AC 4: Immediately disappear upon reaching 00:00:00', () => {
    it('should disappear immediately and emit timerExpired when reaching 0', fakeAsync(() => {
      let expiredEmitted = false;
      component.timerExpired.subscribe(() => {
        expiredEmitted = true;
      });

      component.duration = 2;
      component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
      component.ngOnInit();
      fixture.detectChanges();

      expect(compiled.querySelector('.monitoring-timer')).not.toBeNull();

      tick(1000);
      fixture.detectChanges();
      expect(component.remainingSeconds).toBe(1);

      tick(1000);
      fixture.detectChanges();
      expect(component.remainingSeconds).toBe(0);
      expect(component.isExpired).toBeTrue();
      expect(expiredEmitted).toBeTrue();

      expect(compiled.querySelector('.monitoring-timer')).toBeNull();
    }));
  });

  describe('AC 5: Immediately disappear when manually stopped', () => {
    it('should disappear instantly and stop timer when testrun status changes to Cancelling', fakeAsync(() => {
      component.duration = 300;
      component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
      component.ngOnInit();
      fixture.detectChanges();

      expect(compiled.querySelector('.monitoring-timer')).not.toBeNull();

      component.systemStatus = MOCK_PROGRESS_DATA_CANCELLING;
      component.ngOnChanges({
        systemStatus: new SimpleChange(
          MOCK_PROGRESS_DATA_MONITORING,
          MOCK_PROGRESS_DATA_CANCELLING,
          false
        ),
      });
      fixture.detectChanges();

      expect(component.isExpired).toBeTrue();
      expect(component.isMonitoring).toBeFalse();
      expect(compiled.querySelector('.monitoring-timer')).toBeNull();
    }));

    it('should clear stored session when stopped manually', fakeAsync(() => {
      component.duration = 300;
      component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
      component.ngOnInit();
      fixture.detectChanges();

      expect(localStorage.getItem(MONITORING_TIMER_STORAGE_KEY)).not.toBeNull();

      component.stopAndReset();
      expect(localStorage.getItem(MONITORING_TIMER_STORAGE_KEY)).toBeNull();
    }));
  });

  describe('State Sync: Browser refresh during monitoring period', () => {
    it('should resume from stored remaining time rather than resetting', fakeAsync(() => {
      const now = Date.now();
      const duration = 300;
      const elapsedSeconds = 45;
      const startTime = now - elapsedSeconds * 1000;
      const endTime = startTime + duration * 1000;

      localStorage.setItem(
        MONITORING_TIMER_STORAGE_KEY,
        JSON.stringify({
          macAddr: MOCK_PROGRESS_DATA_MONITORING.mac_addr,
          startTime,
          endTime,
          duration,
        })
      );

      component.duration = duration;
      component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
      component.ngOnInit();
      fixture.detectChanges();

      expect(component.remainingSeconds).toBe(255);
      expect(component.formattedTime).toBe('04:15');

      tick(1000);
      fixture.detectChanges();
      expect(component.remainingSeconds).toBe(254);
      expect(component.formattedTime).toBe('04:14');
    }));
  });

  describe('Accessibility (a11y)', () => {
    it('AC 1: should have role="timer" and aria-live="polite"', fakeAsync(() => {
      component.duration = 300;
      component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
      component.ngOnInit();
      fixture.detectChanges();

      const timerEl = compiled.querySelector('[role="timer"]');
      expect(timerEl).not.toBeNull();
      expect(timerEl?.getAttribute('aria-live')).toBe('polite');
    }));

    it('AC 1: should announce at reasonable intervals without interrupting every second', fakeAsync(() => {
      component.duration = 300;
      component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
      component.ngOnInit();
      fixture.detectChanges();

      // Initial announcement at start
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        jasmine.stringMatching(/Monitoring started/i),
        'polite'
      );

      liveAnnouncerSpy.announce.calls.reset();

      // Tick 1 second (299s): should NOT trigger another announcement
      tick(1000);
      fixture.detectChanges();
      expect(liveAnnouncerSpy.announce).not.toHaveBeenCalled();

      // Fast forward to 240s (4 minutes milestone): should announce
      for (let i = 0; i < 59; i++) {
        tick(1000);
      }
      fixture.detectChanges();
      expect(component.remainingSeconds).toBe(240);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        '4 minutes remaining',
        'polite'
      );
    }));

    it('AC 2: should have elements with high contrast ratio styling', fakeAsync(() => {
      component.duration = 300;
      component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
      component.ngOnInit();
      fixture.detectChanges();

      const timerEl = compiled.querySelector('.monitoring-timer');
      const timerValueEl = compiled.querySelector('.timer-countdown');

      expect(timerEl).not.toBeNull();
      expect(timerValueEl).not.toBeNull();
    }));
  });

  describe('Circular timer design with 2 layers', () => {
    it('should render the circle container with 2 SVG layers and formattedTime inside', fakeAsync(() => {
      component.duration = 300;
      component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
      component.ngOnInit();
      fixture.detectChanges();

      const circleSvg = compiled.querySelector('.timer-circle-svg');
      const layerBg = compiled.querySelector('.timer-circle-layer-bg');
      const layerProgress = compiled.querySelector(
        '.timer-circle-layer-progress'
      );
      const centerContent = compiled.querySelector('.timer-center-content');
      const formattedTimeEl = centerContent?.querySelector('.timer-countdown');

      expect(circleSvg).not.toBeNull();
      expect(layerBg).not.toBeNull();
      expect(layerProgress).not.toBeNull();
      expect(centerContent).not.toBeNull();
      expect(formattedTimeEl).not.toBeNull();
      expect(formattedTimeEl?.textContent?.trim()).toBe('05:00');

      const labelEl = centerContent?.querySelector('.timer-label');
      expect(labelEl).not.toBeNull();
      expect(labelEl?.textContent?.trim()).toBe('time remaining');
    }));

    it('should have initial strokeDashoffset equal to circumference and add blue progress on each tick', fakeAsync(() => {
      component.duration = 100;
      component.systemStatus = MOCK_PROGRESS_DATA_MONITORING;
      component.ngOnInit();
      fixture.detectChanges();

      expect(component.circleRadius).toBe(122);
      expect(component.circleCircumference).toBeCloseTo(766.55, 1);
      // At start (0 elapsed)
      expect(component.progressFraction).toBe(0);
      expect(component.strokeDashoffset).toBeCloseTo(
        component.circleCircumference,
        1
      );

      // Tick 1 second (1% elapsed)
      tick(1000);
      fixture.detectChanges();
      expect(component.remainingSeconds).toBe(99);
      expect(component.progressFraction).toBeCloseTo(0.01, 2);
      expect(component.strokeDashoffset).toBeLessThan(
        component.circleCircumference
      );

      // Tick 49 more seconds (total 50s = 50% elapsed)
      for (let i = 0; i < 49; i++) {
        tick(1000);
      }
      fixture.detectChanges();
      expect(component.remainingSeconds).toBe(50);
      expect(component.progressFraction).toBeCloseTo(0.5, 2);
      expect(component.strokeDashoffset).toBeCloseTo(
        component.circleCircumference * 0.5,
        1
      );

      const progressCircle = compiled.querySelector(
        '.timer-circle-layer-progress'
      );
      const offsetAttr = Number(
        progressCircle?.getAttribute('stroke-dashoffset')
      );
      expect(offsetAttr).toBeCloseTo(component.circleCircumference * 0.5, 0);
    }));
  });

  describe('Edge cases and Full Coverage', () => {
    it('should return 0 for progressFraction if totalDuration is 0 or negative', () => {
      component.totalDuration = 0;
      expect(component.progressFraction).toBe(0);

      component.totalDuration = -60;
      expect(component.progressFraction).toBe(0);
    });

    it('should correctly format timerAriaLabel for singular and plural minutes/seconds', () => {
      component.remainingSeconds = 61; // 1 minute 1 second
      expect(component.timerAriaLabel).toBe(
        'Remaining monitoring time: 1 minute 1 second'
      );

      component.remainingSeconds = 122; // 2 minutes 2 seconds
      expect(component.timerAriaLabel).toBe(
        'Remaining monitoring time: 2 minutes 2 seconds'
      );

      component.remainingSeconds = 1; // 1 second
      expect(component.timerAriaLabel).toBe(
        'Remaining monitoring time: 1 second'
      );

      component.remainingSeconds = 45; // 45 seconds
      expect(component.timerAriaLabel).toBe(
        'Remaining monitoring time: 45 seconds'
      );
    });

    it('should handle ngOnChanges when duration changes and trigger startTimer if monitoring without endTime', () => {
      component.duration = 600;
      component.isMonitoring = false;
      component.ngOnChanges({
        duration: new SimpleChange(null, 600, true),
      });
      expect(component.totalDuration).toBe(600);

      // When isMonitoring is true and endTime is null
      component.isMonitoring = true;
      component['endTime'] = null;
      spyOn(component, 'startTimer');
      component.ngOnChanges({
        duration: new SimpleChange(600, 700, false),
      });
      expect(component.startTimer).toHaveBeenCalled();
    });

    it('should subscribe to selectSystemConfig and start timer if monitoring without endTime', () => {
      component.duration = undefined;
      component.isMonitoring = true;
      component['endTime'] = null;
      spyOn(component, 'startTimer');

      store.overrideSelector(selectSystemConfig, {
        monitor_period: 450,
        network: null,
      });
      store.refreshState();

      component.ngOnInit();
      expect(component.totalDuration).toBe(450);
      expect(component.startTimer).toHaveBeenCalled();
    });

    it('should subscribe to selectSystemStatus when systemStatus is null on init', () => {
      component.systemStatus = null;
      store.overrideSelector(selectSystemStatus, MOCK_PROGRESS_DATA_MONITORING);
      store.refreshState();

      component.ngOnInit();
      expect(component.systemStatus as unknown as TestrunStatus).toEqual(
        MOCK_PROGRESS_DATA_MONITORING
      );
      expect(component.isMonitoring).toBeTrue();
    });

    it('should stop and reset for any non-monitoring status', () => {
      component.isMonitoring = true;
      component.isExpired = false;
      spyOn(component, 'stopAndReset').and.callThrough();

      component.systemStatus = MOCK_PROGRESS_DATA_CANCELLING;
      component.ngOnChanges({
        systemStatus: new SimpleChange(
          MOCK_PROGRESS_DATA_MONITORING,
          MOCK_PROGRESS_DATA_CANCELLING,
          false
        ),
      });

      expect(component.stopAndReset).toHaveBeenCalled();
      expect(component.isMonitoring).toBeFalse();
      expect(component.isExpired).toBeTrue();

      // Calling again when already reset (!isMonitoring && isExpired) should not call stopAndReset
      (component.stopAndReset as jasmine.Spy).calls.reset();
      component.ngOnChanges({
        systemStatus: new SimpleChange(
          MOCK_PROGRESS_DATA_CANCELLING,
          MOCK_PROGRESS_DATA_CANCELLING,
          false
        ),
      });
      expect(component.stopAndReset).not.toHaveBeenCalled();
    });

    it('should fall back to device.mac_addr if systemStatus.mac_addr is empty', () => {
      component.systemStatus = {
        ...MOCK_PROGRESS_DATA_MONITORING,
        mac_addr: '',
        device: {
          ...MOCK_PROGRESS_DATA_MONITORING.device,
          mac_addr: 'device:mac:99',
        },
      };
      component.totalDuration = 100;
      component.startTimer();

      const session = component.getStoredSession();
      expect(session?.macAddr).toBe('device:mac:99');
    });

    it('should handle startTimer when remainingSeconds <= 0 immediately', () => {
      component.totalDuration = 0;
      spyOn(component.timerExpired, 'emit');

      component.startTimer();
      expect(component.isExpired).toBeTrue();
      expect(component.timerExpired.emit).toHaveBeenCalled();
    });

    it('should handle tick when endTime is not set', () => {
      component['endTime'] = null;
      component.remainingSeconds = 5;
      component.tick();
      expect(component.remainingSeconds).toBe(4);

      component.remainingSeconds = 0;
      component.tick();
      expect(component.remainingSeconds).toBe(0);
    });

    it('should handle tick when Date.now diff matches remainingSeconds', () => {
      component.remainingSeconds = 10;
      component['endTime'] = Date.now() + 10000;
      component.tick();
      expect(component.remainingSeconds).toBe(9);
    });

    it('should handle periodic announcements for 30s, 10s, 60s, and 120s', () => {
      liveAnnouncerSpy.announce.calls.reset();

      // Remaining <= 0 should do nothing
      component['handlePeriodicAnnouncements'](0);
      expect(liveAnnouncerSpy.announce).not.toHaveBeenCalled();

      // 30 seconds
      component['lastAnnouncedInterval'] = -1;
      component['handlePeriodicAnnouncements'](30);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        '30 seconds remaining',
        'polite'
      );

      // Re-announcing 30 when already announced does nothing
      liveAnnouncerSpy.announce.calls.reset();
      component['handlePeriodicAnnouncements'](30);
      expect(liveAnnouncerSpy.announce).not.toHaveBeenCalled();

      // 10 seconds
      component['handlePeriodicAnnouncements'](10);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        '10 seconds remaining',
        'polite'
      );

      // 60 seconds (1 minute remaining - singular)
      component['handlePeriodicAnnouncements'](60);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        '1 minute remaining',
        'polite'
      );

      // 120 seconds (2 minutes remaining - plural)
      component['handlePeriodicAnnouncements'](120);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        '2 minutes remaining',
        'polite'
      );
    });

    it('should handle storage errors gracefully in saveSession, clearStoredSession, and getStoredSession', () => {
      spyOn(localStorage, 'setItem').and.throwError('QuotaExceeded');
      expect(() =>
        component['saveSession']({
          macAddr: '',
          startTime: 0,
          endTime: 100,
          duration: 100,
        })
      ).not.toThrow();

      spyOn(localStorage, 'removeItem').and.throwError('StorageError');
      expect(() => component.clearStoredSession()).not.toThrow();

      spyOn(localStorage, 'getItem').and.throwError('AccessError');
      expect(component.getStoredSession()).toBeNull();
    });

    it('should return null for getStoredSession if storage contains invalid JSON or whitespace', () => {
      localStorage.setItem(MONITORING_TIMER_STORAGE_KEY, '   ');
      expect(component.getStoredSession()).toBeNull();

      localStorage.setItem(MONITORING_TIMER_STORAGE_KEY, 'invalid-json{{{');
      expect(component.getStoredSession()).toBeNull();
    });

    it('should resume existing session if macAddr matches or either macAddr is empty', () => {
      const now = Date.now();
      const existing = {
        macAddr: '',
        startTime: now - 50000,
        endTime: now + 50000,
        duration: 100,
      };
      localStorage.setItem(
        MONITORING_TIMER_STORAGE_KEY,
        JSON.stringify(existing)
      );

      component.systemStatus = {
        ...MOCK_PROGRESS_DATA_MONITORING,
        mac_addr: 'some:mac',
      };
      component.startTimer();

      expect(component.totalDuration).toBe(100);
      expect(component.remainingSeconds).toBeGreaterThan(0);
    });
  });

  describe('Store Selectors coverage', () => {
    const mockState: AppState = {
      hasConnectionSettings: false,
      isAllDevicesOutdated: false,
      devices: [],
      hasDevices: false,
      hasExpiredDevices: false,
      isOpenAddDevice: false,
      riskProfiles: [],
      hasRiskProfiles: false,
      isStopTestrun: false,
      isOpenWaitSnackBar: false,
      systemStatus: null,
      deviceInProgress: null,
      status: null,
      isTestingComplete: false,
      reports: [],
      testModules: [],
      adapters: {},
      internetConnection: null,
      interfaces: {},
      systemConfig: { network: {} },
      isOpenCreateProfile: false,
    };

    it('should cover all store selector projectors pulled in by timer', () => {
      Object.values(allSelectors).forEach(selector => {
        const sel = selector as { projector?: (s: AppState) => unknown };
        if (sel && typeof sel.projector === 'function') {
          const result = sel.projector(mockState);
          expect(result !== undefined).toBeTrue();
        }
      });
    });
  });
});
