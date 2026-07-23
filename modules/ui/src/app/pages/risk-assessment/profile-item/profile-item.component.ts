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
  Input,
  Output,
  inject,
} from '@angular/core';
import {
  Profile,
  ProfileStatus,
  RiskResultClassName,
} from '../../../model/profile';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule, DatePipe } from '@angular/common';
import { TestRunService } from '../../../services/test-run.service';
import { MatTooltip, MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-profile-item',

  imports: [MatIcon, MatButtonModule, CommonModule, MatTooltipModule],
  providers: [MatTooltip, DatePipe],
  templateUrl: './profile-item.component.html',
  styleUrl: './profile-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileItemComponent {
  private readonly testRunService = inject(TestRunService);
  private datePipe = inject(DatePipe);

  public readonly ProfileStatus = ProfileStatus;
  @Input() profile!: Profile;
  @Output() profileClicked = new EventEmitter<Profile>();

  public getRiskClass(riskResult: string): RiskResultClassName {
    return this.testRunService.getRiskClass(riskResult);
  }

  public async enterProfileItem(profile: Profile) {
    this.profileClicked.emit(profile);
  }

  getProfileItemLabel(profile: Profile) {
    return `${profile.status} ${profile.risk} risk ${profile.name} ${this.datePipe.transform(profile.created, 'dd MMM yyyy')}`;
  }
}
