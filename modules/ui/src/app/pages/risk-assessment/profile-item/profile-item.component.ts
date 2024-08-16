/*
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
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import {
  Profile,
  ProfileStatus,
  RiskResultClassName,
} from '../../../model/profile';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { TestRunService } from '../../../services/test-run.service';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Component({
  selector: 'app-profile-item',
  standalone: true,
  imports: [MatIcon, MatButtonModule, CommonModule, MatTooltipModule],
  providers: [MatTooltip],
  templateUrl: './profile-item.component.html',
  styleUrl: './profile-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileItemComponent {
  public readonly ProfileStatus = ProfileStatus;
  public readonly EXPIRED_TOOLTIP =
    'Expired. Please, create a new Risk profile.';
  @Input() profile!: Profile;
  @Output() deleteButtonClicked = new EventEmitter<string>();
  @Output() profileClicked = new EventEmitter<Profile>();
  @Output() copyProfileClicked = new EventEmitter<Profile>();

  @ViewChild('tooltip') tooltip!: MatTooltip;

  @HostListener('focusout', ['$event'])
  outEvent(): void {
    if (this.profile.status === ProfileStatus.EXPIRED) {
      this.tooltip.message = this.EXPIRED_TOOLTIP;
    }
  }

  constructor(
    private readonly testRunService: TestRunService,
    private liveAnnouncer: LiveAnnouncer
  ) {}

  public getRiskClass(riskResult: string): RiskResultClassName {
    return this.testRunService.getRiskClass(riskResult);
  }

  public async enterProfileItem(profile: Profile) {
    if (profile.status === ProfileStatus.EXPIRED) {
      this.tooltip.message =
        'This risk profile is outdated. Please create a new risk profile.';
      this.tooltip.show();
      await this.liveAnnouncer.announce(
        'This risk profile is outdated. Please create a new risk profile.'
      );
    } else {
      this.profileClicked.emit(profile);
    }
  }
}
