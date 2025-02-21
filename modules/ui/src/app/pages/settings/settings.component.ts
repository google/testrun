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
  OnDestroy,
  OnInit,
} from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CommonModule } from '@angular/common';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import { Routes } from '../../model/routes';
import { filter, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, MatToolbarModule, MatTabsModule, RouterModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit, OnDestroy {
  private routes = [Routes.General, Routes.Certificates];
  private destroy$: Subject<boolean> = new Subject<boolean>();
  selectedIndex = 0;
  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const currentRoute = this.router.url;
    this.setSelectedIndex(currentRoute);

    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe(event => {
        if (event.url !== currentRoute) {
          this.setSelectedIndex(event.url);
        }
      });
  }

  onTabChange(event: MatTabChangeEvent): void {
    const index = event.index;
    this.router.navigate([this.routes[index]], { relativeTo: this.route });
  }

  private setSelectedIndex(currentRoute: string): void {
    this.selectedIndex = this.routes.findIndex(route =>
      currentRoute.includes(route)
    );
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
