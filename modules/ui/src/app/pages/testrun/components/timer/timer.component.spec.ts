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
import { LiveAnnouncer } from '@angular/cdk/a11y';
import {
  DEFAULT_MONITOR_PERIOD,
  TimerComponent,
  MONITORING_TIMER_STORAGE_KEY,
  TimerSessionData,
} from './timer.component';

describe('TimerComponent', () => {
  let component: TimerComponent;
  let fixture: ComponentFixture<TimerComponent>;
  let compiled: HTMLElement;
  let liveAnnouncerSpy: jasmine.SpyObj<LiveAnnouncer>;

  beforeEach(() => {
    localStorage.removeItem(MONITORING_TIMER_STORAGE_KEY);
    sessionStorage.removeItem(MONITORING_TIMER_STORAGE_KEY);
    liveAnnouncerSpy = jasmine.createSpyObj('LiveAnnouncer', ['announce']);

    TestBed.configureTestingModule({
      imports: [TimerComponent],
      providers: [{ provide: LiveAnnouncer, useValue: liveAnnouncerSpy }],
    });

    fixture = TestBed.createComponent(TimerComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement;
  });

  afterEach(() => {
    component.ngOnDestroy();
    component.clearStoredSession();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization and Inputs', () => {
    it('should set totalDuration from duration input on init', () => {
      component.duration = 180;
      component.ngOnInit();
      expect(component.totalDuration).toBe(180);
    });

    it('should fallback to DEFAULT_MONITOR_PERIOD when duration input is undefined', () => {
      component.duration = undefined;
      component.ngOnInit();
      expect(component.totalDuration).toBe(DEFAULT_MONITOR_PERIOD);
    });

    it('should initialize and calculate remaining time from startTime input', () => {
      const now = Date.now();
      component.duration = 300;
      component.startTime = new Date(now - 60000).toISOString();
      component.ngOnInit();

      expect(component.totalDuration).toBe(300);
      expect(component.remainingSeconds).toBeCloseTo(240, 1);
    });
  });

  describe('Progress and Formatting', () => {
    it('should return progressFraction 0 when totalDuration is 0 or negative', () => {
      component.totalDuration = 0;
      component.remainingSeconds = 0;
      expect(component.progressFraction).toBe(0);

      component.totalDuration = -10;
      expect(component.progressFraction).toBe(0);
    });

    it('should calculate progressFraction and strokeDashoffset correctly', () => {
      component.totalDuration = 100;
      component.remainingSeconds = 50;
      expect(component.progressFraction).toBe(0.5);
      expect(component.strokeDashoffset).toBeCloseTo(
        component.circleCircumference * 0.5,
        1
      );

      component.remainingSeconds = 0;
      expect(component.progressFraction).toBe(1);
      expect(component.strokeDashoffset).toBeCloseTo(0, 1);
    });

    it('should format time with zero padding for minutes and seconds', () => {
      component.remainingSeconds = 305;
      expect(component.formattedTime).toBe('05:05');

      component.remainingSeconds = 59;
      expect(component.formattedTime).toBe('00:59');

      component.remainingSeconds = 0;
      expect(component.formattedTime).toBe('00:00');
    });

    it('should format timerAriaLabel correctly for singular and plural', () => {
      component.remainingSeconds = 61;
      expect(component.timerAriaLabel).toBe(
        'Remaining monitoring time: 1 minute 1 second'
      );

      component.remainingSeconds = 122;
      expect(component.timerAriaLabel).toBe(
        'Remaining monitoring time: 2 minutes 2 seconds'
      );

      component.remainingSeconds = 45;
      expect(component.timerAriaLabel).toBe(
        'Remaining monitoring time: 45 seconds'
      );
    });
  });

  describe('Countdown and Ticking', () => {
    it('should count down each second and expire when reaching 0', fakeAsync(() => {
      component.duration = 3;

      component.ngOnInit();
      expect(component.remainingSeconds).toBe(3);

      tick(1000);
      expect(component.remainingSeconds).toBe(2);

      tick(1000);
      expect(component.remainingSeconds).toBe(1);

      tick(1000);
      expect(component.remainingSeconds).toBe(0);
      expect(component.isExpired).toBeTrue();
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        'Monitoring period completed',
        'polite'
      );
    }));

    it('should expire immediately if totalDuration is <= 0 on startTimer', () => {
      component.totalDuration = 0;

      component.startTimer();
      expect(component.isExpired).toBeTrue();
    });

    it('should tick decrement remainingSeconds when endTime is null', () => {
      component['endTime'] = null;
      component.remainingSeconds = 5;
      component.tick();
      expect(component.remainingSeconds).toBe(4);

      component.remainingSeconds = 0;
      component.tick();
      expect(component.remainingSeconds).toBe(0);
    });

    it('should tick decrement remainingSeconds when Date.now matches remainingSeconds', () => {
      component.remainingSeconds = 10;
      component['endTime'] = Date.now() + 10000;
      component.tick();
      expect(component.remainingSeconds).toBe(9);
    });

    it('should stop timer and unsubscribe on stopTimer', () => {
      component.duration = 300;
      component.startTimer();
      expect(component['timerSubscription']).toBeDefined();

      component.stopTimer();
      expect(component['timerSubscription']).toBeUndefined();
    });
  });

  describe('Audio announcements (LiveAnnouncer)', () => {
    it('should announce start of monitoring initially', () => {
      component.totalDuration = 300;
      component.startTimer();

      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        jasmine.stringMatching(/Monitoring started\. 5 minutes remaining\./i),
        'polite'
      );
    });

    it('should handle periodic announcements for 30s, 10s, 60s, and 120s', () => {
      liveAnnouncerSpy.announce.calls.reset();

      // Remaining <= 0 does nothing
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

      // 60 seconds (1 minute remaining)
      component['handlePeriodicAnnouncements'](60);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        '1 minute remaining',
        'polite'
      );

      // 120 seconds (2 minutes remaining)
      component['handlePeriodicAnnouncements'](120);
      expect(liveAnnouncerSpy.announce).toHaveBeenCalledWith(
        '2 minutes remaining',
        'polite'
      );
    });

    it('should not fail announceText if liveAnnouncer is not present', () => {
      (
        component as unknown as { liveAnnouncer: LiveAnnouncer | null }
      ).liveAnnouncer = null;
      expect(() =>
        component['announceText']('test announcement')
      ).not.toThrow();
      expect(component.liveAnnouncementText).toBe('test announcement');
    });
  });

  describe('Session Storage Handling via Spies (No Direct Storage Write)', () => {
    it('should resume existing session if not expired', () => {
      const now = Date.now();
      const mockSession: TimerSessionData = {
        startTime: now - 30000,
        endTime: now + 70000,
        duration: 100,
      };

      spyOn(localStorage, 'getItem').and.returnValue(
        JSON.stringify(mockSession)
      );

      component.startTimer();

      expect(component.totalDuration).toBe(100);
      expect(component.remainingSeconds).toBeGreaterThan(0);
    });

    it('should save session data to localStorage and sessionStorage when starting fresh countdown', () => {
      const localSpy = spyOn(localStorage, 'setItem');
      const sessionSpy = spyOn(sessionStorage, 'setItem');
      spyOn(localStorage, 'getItem').and.returnValue(null);
      spyOn(sessionStorage, 'getItem').and.returnValue(null);

      component.totalDuration = 100;
      component.startTimer();

      expect(localSpy).toHaveBeenCalledWith(
        MONITORING_TIMER_STORAGE_KEY,
        jasmine.stringMatching(/"duration":100/)
      );
      expect(sessionSpy).toHaveBeenCalledWith(
        MONITORING_TIMER_STORAGE_KEY,
        jasmine.stringMatching(/"duration":100/)
      );
    });

    it('should return session from sessionStorage if localStorage returns null', () => {
      const now = Date.now();
      const mockSession: TimerSessionData = {
        startTime: now,
        endTime: now + 60000,
        duration: 60,
      };

      spyOn(localStorage, 'getItem').and.returnValue(null);
      spyOn(sessionStorage, 'getItem').and.returnValue(
        JSON.stringify(mockSession)
      );

      const session = component.getStoredSession();
      expect(session).toEqual(mockSession);
    });

    it('should return null for getStoredSession if storage contains invalid JSON or whitespace', () => {
      spyOn(localStorage, 'getItem').and.returnValue('   ');
      expect(component.getStoredSession()).toBeNull();

      (localStorage.getItem as jasmine.Spy).and.returnValue('invalid-json{{{');
      expect(component.getStoredSession()).toBeNull();
    });

    it('should handle storage errors gracefully in saveSession, clearStoredSession, and getStoredSession', () => {
      spyOn(localStorage, 'setItem').and.throwError('QuotaExceeded');
      expect(() =>
        component['saveSession']({
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

    it('should clear stored session when handleExpire is called', () => {
      const localRemoveSpy = spyOn(localStorage, 'removeItem');
      const sessionRemoveSpy = spyOn(sessionStorage, 'removeItem');

      component['handleExpire']();

      expect(localRemoveSpy).toHaveBeenCalledWith(MONITORING_TIMER_STORAGE_KEY);
      expect(sessionRemoveSpy).toHaveBeenCalledWith(
        MONITORING_TIMER_STORAGE_KEY
      );
    });

    it('should call handleExpire on ngOnDestroy', () => {
      const localRemoveSpy = spyOn(localStorage, 'removeItem');
      const sessionRemoveSpy = spyOn(sessionStorage, 'removeItem');

      component.duration = 300;
      component.ngOnInit();
      component.ngOnDestroy();

      expect(component.isExpired).toBeTrue();
      expect(component['timerSubscription']).toBeUndefined();
      expect(localRemoveSpy).toHaveBeenCalledWith(MONITORING_TIMER_STORAGE_KEY);
      expect(sessionRemoveSpy).toHaveBeenCalledWith(
        MONITORING_TIMER_STORAGE_KEY
      );
    });
  });

  describe('DOM Elements and Styling', () => {
    it('should render the circular SVG with 2 layers and "time remaining" label', fakeAsync(() => {
      component.duration = 300;
      component.ngOnInit();
      fixture.detectChanges();

      const timerWidget = compiled.querySelector('#monitoring-countdown-timer');
      expect(timerWidget).not.toBeNull();

      const svg = compiled.querySelector('.timer-circle-svg');
      expect(svg).not.toBeNull();

      const bgLayer = compiled.querySelector('.timer-circle-layer-bg');
      expect(bgLayer).not.toBeNull();

      const progressLayer = compiled.querySelector(
        '.timer-circle-layer-progress'
      );
      expect(progressLayer).not.toBeNull();

      const timeValue = compiled.querySelector('#monitoring-timer-value');
      expect(timeValue?.textContent?.trim()).toBe('05:00');

      const label = compiled.querySelector('.timer-label');
      expect(label?.textContent?.trim()).toBe('time remaining');
    }));

    it('should hide timer widget when expired or remainingSeconds is 0', fakeAsync(() => {
      component.duration = 1;
      component.ngOnInit();
      fixture.detectChanges();

      expect(
        compiled.querySelector('#monitoring-countdown-timer')
      ).not.toBeNull();

      tick(1000);
      fixture.detectChanges();

      expect(compiled.querySelector('#monitoring-countdown-timer')).toBeNull();
    }));
  });
});
