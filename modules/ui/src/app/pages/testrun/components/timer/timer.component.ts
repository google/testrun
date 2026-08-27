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
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subject, Subscription, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestrunStatus } from '../../../../model/testrun-status';

export const MONITORING_TIMER_STORAGE_KEY = 'testrun_monitoring_timer_session';
export const DEFAULT_MONITOR_PERIOD = 300;

export interface TimerSessionData {
  macAddr: string;
  startTime: number;
  endTime: number;
  duration: number;
}

@Component({
  selector: 'app-timer, app-testrun-timer',
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
})
export class TimerComponent implements OnInit, OnDestroy {
  @Input() duration?: number;
  @Input() systemStatus?: TestrunStatus | null;
  @Output() timerExpired = new EventEmitter<void>();

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly liveAnnouncer = inject(LiveAnnouncer, { optional: true });

  public remainingSeconds = 0;
  public totalDuration = DEFAULT_MONITOR_PERIOD;
  public isExpired = false;
  public liveAnnouncementText = '';

  private timerSubscription?: Subscription;
  private destroy$ = new Subject<void>();
  private lastAnnouncedInterval = -1;
  private endTime: number | null = null;
  private startTime: number | null = null;

  public readonly circleRadius = 122;
  public readonly circleCircumference = 2 * Math.PI * 122;

  get progressFraction(): number {
    if (!this.totalDuration || this.totalDuration <= 0) {
      return 0;
    }
    const elapsed = Math.max(0, this.totalDuration - this.remainingSeconds);
    return Math.min(1, Math.max(0, elapsed / this.totalDuration));
  }

  get strokeDashoffset(): number {
    return this.circleCircumference * (1 - this.progressFraction);
  }

  get formattedTime(): string {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    const paddedMinutes = minutes.toString().padStart(2, '0');
    const paddedSeconds = seconds.toString().padStart(2, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
  }

  get timerAriaLabel(): string {
    const minutes = Math.floor(this.remainingSeconds / 60);
    const seconds = this.remainingSeconds % 60;
    let text = 'Remaining monitoring time: ';
    if (minutes > 0) {
      text += `${minutes} minute${minutes !== 1 ? 's' : ''} `;
    }
    text += `${seconds} second${seconds !== 1 ? 's' : ''}`;
    return text;
  }

  ngOnInit(): void {
    this.initDuration();
    this.init();
  }

  private initDuration(): void {
    this.totalDuration = Number(this.duration);
  }

  private init(): void {
    this.isExpired = false;
    this.startTimer();
  }

  public startTimer(): void {
    const macAddr =
      this.systemStatus?.mac_addr || this.systemStatus?.device?.mac_addr || '';
    const existingSession = this.getStoredSession();
    const now = Date.now();

    if (
      existingSession &&
      existingSession.endTime > now &&
      (!macAddr ||
        !existingSession.macAddr ||
        existingSession.macAddr === macAddr)
    ) {
      // Resume from saved session (e.g. browser refresh during monitoring)
      this.startTime = existingSession.startTime;
      this.endTime = existingSession.endTime;
      this.totalDuration = existingSession.duration;
      this.remainingSeconds = Math.max(
        0,
        Math.ceil((this.endTime - now) / 1000)
      );
    } else {
      // Initiate fresh countdown
      this.startTime = now;
      this.endTime = now + this.totalDuration * 1000;
      this.remainingSeconds = this.totalDuration;
      this.saveSession({
        macAddr,
        startTime: this.startTime,
        endTime: this.endTime,
        duration: this.totalDuration,
      });
    }

    if (this.remainingSeconds <= 0) {
      this.handleExpire();
      return;
    }

    this.isExpired = false;
    this.lastAnnouncedInterval = -1;
    this.announceInitial();
    this.runCountdown();
    this.cdr.markForCheck();
  }

  private runCountdown(): void {
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.tick();
      });
  }

  public tick(): void {
    if (!this.endTime) {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
      }
    } else {
      const now = Date.now();
      const diffMs = this.endTime - now;
      let remaining = Math.max(0, Math.ceil(diffMs / 1000));
      // In case fakeAsync test runner does not advance Date.now()
      if (remaining === this.remainingSeconds && this.remainingSeconds > 0) {
        remaining = this.remainingSeconds - 1;
      }
      this.remainingSeconds = remaining;
    }

    this.handlePeriodicAnnouncements(this.remainingSeconds);
    this.cdr.markForCheck();

    if (this.remainingSeconds <= 0) {
      this.handleExpire();
    }
  }

  public stopTimer(): void {
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = undefined;
  }

  private handleExpire(): void {
    this.isExpired = true;
    this.stopTimer();
    this.clearStoredSession();
    this.timerExpired.emit();
    this.announceText('Monitoring period completed');
    this.cdr.markForCheck();
  }

  private announceInitial(): void {
    const minutes = Math.ceil(this.remainingSeconds / 60);
    const text = `Monitoring started. ${minutes} minute${minutes !== 1 ? 's' : ''} remaining.`;
    this.announceText(text);
  }

  private handlePeriodicAnnouncements(remaining: number): void {
    if (remaining <= 0) {
      return;
    }
    if (remaining === 30 && this.lastAnnouncedInterval !== 30) {
      this.lastAnnouncedInterval = 30;
      this.announceText('30 seconds remaining');
    } else if (remaining === 10 && this.lastAnnouncedInterval !== 10) {
      this.lastAnnouncedInterval = 10;
      this.announceText('10 seconds remaining');
    } else if (
      remaining > 30 &&
      remaining % 60 === 0 &&
      this.lastAnnouncedInterval !== remaining
    ) {
      this.lastAnnouncedInterval = remaining;
      const mins = Math.floor(remaining / 60);
      this.announceText(`${mins} minute${mins !== 1 ? 's' : ''} remaining`);
    }
  }

  private announceText(text: string): void {
    this.liveAnnouncementText = text;
    if (this.liveAnnouncer) {
      this.liveAnnouncer.announce(text, 'polite');
    }
  }

  private saveSession(session: TimerSessionData): void {
    try {
      const serialized = JSON.stringify(session);
      localStorage.setItem(MONITORING_TIMER_STORAGE_KEY, serialized);
      sessionStorage.setItem(MONITORING_TIMER_STORAGE_KEY, serialized);
    } catch {
      // Ignore storage errors
    }
  }

  public getStoredSession(): TimerSessionData | null {
    try {
      const raw =
        localStorage.getItem(MONITORING_TIMER_STORAGE_KEY) ||
        sessionStorage.getItem(MONITORING_TIMER_STORAGE_KEY);
      if (raw && raw.trim() !== '') {
        return JSON.parse(raw) as TimerSessionData;
      }
    } catch {
      // Ignore storage parse errors
    }
    return null;
  }

  public clearStoredSession(): void {
    try {
      localStorage.removeItem(MONITORING_TIMER_STORAGE_KEY);
      sessionStorage.removeItem(MONITORING_TIMER_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  ngOnDestroy(): void {
    this.handleExpire();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
