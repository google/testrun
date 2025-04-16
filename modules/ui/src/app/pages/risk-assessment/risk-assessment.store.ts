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

import { Injectable, inject } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { tap, withLatestFrom } from 'rxjs/operators';
import { catchError, delay, EMPTY, exhaustMap, throwError, timer } from 'rxjs';
import { TestRunService } from '../../services/test-run.service';
import { Profile, ProfileAction, ProfileFormat } from '../../model/profile';
import { FocusManagerService } from '../../services/focus-manager.service';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/state';
import {
  selectIsOpenCreateProfile,
  selectRiskProfiles,
} from '../../store/selectors';
import { setRiskProfiles } from '../../store/actions';
import { EntityAction } from '../../model/entity-action';

export interface AppComponentState {
  selectedProfile: Profile | null;
  profiles: Profile[];
  profileFormat: ProfileFormat[];
  actions: EntityAction[];
}
@Injectable()
export class RiskAssessmentStore extends ComponentStore<AppComponentState> {
  private testRunService = inject(TestRunService);
  private store = inject<Store<AppState>>(Store);
  private focusManagerService = inject(FocusManagerService);

  profiles$ = this.store.select(selectRiskProfiles);
  profileFormat$ = this.select(state => state.profileFormat);
  selectedProfile$ = this.select(state => state.selectedProfile);
  actions$ = this.select(state => state.actions);
  isOpenCreateProfile$ = this.store.select(selectIsOpenCreateProfile);
  viewModel$ = this.select({
    profiles: this.profiles$,
    profileFormat: this.profileFormat$,
    selectedProfile: this.selectedProfile$,
    actions: this.actions$,
  });

  updateProfileFormat = this.updater(
    (state, profileFormat: ProfileFormat[]) => ({
      ...state,
      profileFormat,
    })
  );
  updateSelectedProfile = this.updater(
    (state, selectedProfile: Profile | null) => ({
      ...state,
      selectedProfile,
    })
  );

  deleteProfile = this.effect<{
    name: string;
    onDelete: (idx: number) => void;
  }>(trigger$ => {
    return trigger$.pipe(
      exhaustMap(({ name, onDelete }) => {
        return this.testRunService.deleteProfile(name).pipe(
          withLatestFrom(this.profiles$),
          tap(([remove, current]) => {
            if (remove) {
              const idx = current.findIndex(item => name === item.name);
              this.removeProfile(name, current);
              onDelete(idx);
            }
          })
        );
      })
    );
  });

  setFocus = this.effect<{ nextItem: HTMLElement; firstItem: HTMLElement }>(
    trigger$ => {
      return trigger$.pipe(
        withLatestFrom(this.profiles$),
        tap(([{ nextItem, firstItem }, profiles]) => {
          timer(100).subscribe(() => {
            if (nextItem) {
              this.focusManagerService.focusFirstElementInContainer(nextItem);
            } else if (profiles.length > 1) {
              this.focusManagerService.focusFirstElementInContainer(firstItem);
            } else {
              this.focusManagerService.focusFirstElementInContainer();
            }
          });
        })
      );
    }
  );

  setFocusOnCreateButton = this.effect(trigger$ => {
    return trigger$.pipe(
      delay(10),
      tap(() => {
        this.focusManagerService.focusFirstElementInContainer(
          window.document.querySelector('app-risk-assessment')
        );
      })
    );
  });

  setFocusOnSelectedProfile = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.focusManagerService.focusFirstElementInContainer(
          window.document.querySelector('.entity-list .selected')
        );
      })
    );
  });

  setFocusOnProfileForm = this.effect(trigger$ => {
    return trigger$.pipe(
      tap(() => {
        this.focusManagerService.focusFirstElementInContainer(
          window.document.querySelector('app-profile-form')
        );
      })
    );
  });

  getProfilesFormat = this.effect(trigger$ => {
    return trigger$.pipe(
      exhaustMap(() => {
        return this.testRunService.fetchProfilesFormat().pipe(
          tap((profileFormat: ProfileFormat[]) => {
            this.updateProfileFormat(profileFormat);
          })
        );
      })
    );
  });

  saveProfile = this.effect<{
    profile: Profile;
    onSave: ((profile: Profile) => void) | undefined;
  }>(trigger$ => {
    return trigger$.pipe(
      exhaustMap(({ profile, onSave }) => {
        return this.testRunService.saveProfile(profile).pipe(
          exhaustMap(saved => {
            if (saved) {
              return this.testRunService.fetchProfiles();
            }
            return throwError('Failed to upload profile');
          }),
          tap(newProfiles => {
            this.store.dispatch(setRiskProfiles({ riskProfiles: newProfiles }));
            const uploadedProfile = newProfiles.find(
              p => p.name === profile.name || p.name === profile.rename
            );
            if (onSave && uploadedProfile) {
              onSave(uploadedProfile);
            }
          }),
          catchError(() => {
            return EMPTY;
          })
        );
      })
    );
  });

  updateProfiles(riskProfiles: Profile[]): void {
    this.store.dispatch(setRiskProfiles({ riskProfiles }));
  }

  removeProfile(name: string, current: Profile[]): void {
    const profiles = current.filter(profile => profile.name !== name);
    this.updateProfiles(profiles);
  }

  constructor() {
    super({
      profiles: [],
      profileFormat: [],
      selectedProfile: null,
      actions: [
        { action: ProfileAction.Copy, icon: 'content_copy' },
        { action: ProfileAction.Delete, icon: 'delete' },
      ],
    });
  }
}
