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
  Component,
  HostListener,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { TipConfig } from '../../model/tip-config';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FocusManagerService } from '../../services/focus-manager.service';
import { timer } from 'rxjs/internal/observable/timer';

@Component({
  selector: 'app-help-tip',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './help-tip.component.html',
  styleUrl: './help-tip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpTipComponent implements OnInit {
  data = input<TipConfig>();
  target = input<HTMLElement>();
  action = input<string>();
  onAction = output<void>();
  onCLoseTip = output<boolean>();
  tipPosition = { top: 0, left: 0 };
  private readonly liveAnnouncer = inject(LiveAnnouncer);
  private readonly focusManagerService = inject(FocusManagerService);

  @HostListener('window:resize')
  onResize() {
    this.updateTipPosition(this.target());
  }

  ngOnInit() {
    this.updateTipPosition(this.target());
    this.liveAnnouncer.announce(
      `${this.data()?.title} ${this.data()?.content}`
    );
    this.setFocus();
  }

  private setFocus(): void {
    const helpTipEl = window.document.querySelector('.tip');
    timer(200).subscribe(() => {
      this.focusManagerService.focusFirstElementInContainer(helpTipEl);
    });
  }

  updateTipPosition(target: HTMLElement | undefined | null) {
    if (!target) {
      return;
    }

    const targetRect = target.getBoundingClientRect();

    const tipWidth = 256;
    const arrowOffset = 14;
    const topOffset = 82;

    let top = 0;
    let left = 0;

    switch (this.data()?.position) {
      case 'left':
        top = targetRect.top + window.scrollY + targetRect.height / 2;
        left = targetRect.left + window.scrollX - tipWidth - arrowOffset;
        break;
      case 'right':
        top =
          targetRect.top + window.scrollY - topOffset + targetRect.height / 2;
        left = targetRect.right + window.scrollX;
        break;
      case 'top':
        top = targetRect.top + window.scrollY - arrowOffset; // Position above the button
        left =
          targetRect.left +
          window.scrollX +
          targetRect.width / 2 -
          tipWidth / 2; // Center horizontally above button
        break;
      case 'bottom':
        top = targetRect.bottom + window.scrollY + arrowOffset; // Position below the button
        left =
          targetRect.left +
          window.scrollX +
          targetRect.width / 2 -
          tipWidth / 2; // Center horizontally below button
        break;
      default:
        throw new Error('Unsupported tip position!');
    }

    this.tipPosition = { top, left };
  }

  onActionClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.onAction.emit();
  }
}
