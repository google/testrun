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
  Component,
  HostListener,
  inject,
  input,
  output,
  OnInit,
  ChangeDetectionStrategy,
  NgZone,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { EntityAction } from '../../model/entity-action';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-list-item',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
    CommonModule,
    MatTooltipModule,
    MatTooltip,
  ],
  providers: [MatTooltip],
  templateUrl: './list-item.component.html',
  styleUrl: './list-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListItemComponent<T extends object> implements OnInit {
  private container?: HTMLElement;
  private zone = inject(NgZone);
  entity = input.required<T>();
  actions = input<EntityAction[]>([]);
  menuItemClicked = output<string>();
  tooltip = inject(MatTooltip);
  isDisabled = input<(arg: T) => boolean>();
  tooltipMessage = input<(arg: T) => string>();

  get disabled() {
    const isDisabledFn = this.isDisabled();
    if (isDisabledFn) {
      return isDisabledFn(this.entity());
    }
    return false;
  }

  @HostListener('mouseenter', ['$event'])
  onEvent(event: MouseEvent): void {
    this.zone.run(() => {
      this.updateMessage();
      if (!this.tooltip.message) return;
      this.tooltip.show(0, { x: event.clientX, y: event.clientY });
      this.container = document.querySelector(
        '.mat-mdc-tooltip-panel:has(.list-item-tooltip)'
      ) as HTMLElement;
    });
  }

  @HostListener('mousemove', ['$event'])
  onMoveEvent(event: MouseEvent): void {
    this.zone.run(() => {
      if (!this.tooltip.message) return;
      if (!this.container) {
        this.container = document.querySelector(
          '.mat-mdc-tooltip-panel:has(.list-item-tooltip)'
        ) as HTMLElement;
      }

      this.container.style.top = event.clientY + 'px';
      this.container.style.left = event.clientX + 'px';
    });
  }

  @HostListener('mouseleave')
  outEvent(): void {
    this.tooltip.hide();
  }

  ngOnInit() {
    this.updateMessage();
    this.tooltip.positionAtOrigin = true;
    this.tooltip.tooltipClass = 'list-item-tooltip';
  }

  trackByAction(index: number, item: EntityAction) {
    return item.action;
  }

  private updateMessage() {
    const tooltipMessageFn = this.tooltipMessage();
    if (tooltipMessageFn) {
      const tooltipMessage = tooltipMessageFn(this.entity());
      if (tooltipMessage) {
        this.tooltip.message = tooltipMessage;
      }
    }
  }
}
