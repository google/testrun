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
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatSnackBarAction,
  MatSnackBarActions,
  MatSnackBarLabel,
  MatSnackBarRef,
} from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { AppState } from '../../store/state';
import { setIsOpenWaitSnackBar, setIsStopTestrun } from '../../store/actions';

@Component({
  selector: 'app-snack-bar',

  imports: [
    MatButtonModule,
    MatSnackBarLabel,
    MatSnackBarActions,
    MatSnackBarAction,
  ],
  templateUrl: './snack-bar.component.html',
  styleUrl: './snack-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SnackBarComponent {
  private store = inject<Store<AppState>>(Store);

  snackBarRef = inject(MatSnackBarRef);

  wait(): void {
    this.snackBarRef.dismiss();
    this.store.dispatch(setIsOpenWaitSnackBar({ isOpenWaitSnackBar: false }));
  }

  stop(): void {
    this.store.dispatch(setIsStopTestrun());
    this.wait();
  }
}
