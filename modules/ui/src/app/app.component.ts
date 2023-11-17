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
  ElementRef,
  HostBinding,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { MatDrawer, MatDrawerToggleResult } from '@angular/material/sidenav';
import { TestRunService } from './services/test-run.service';
import { Observable } from 'rxjs/internal/Observable';
import { Device } from './model/device';
import { take } from 'rxjs';

const DEVICES_LOGO_URL = '/assets/icons/devices.svg';
const REPORTS_LOGO_URL = '/assets/icons/reports.svg';
const TESTRUN_LOGO_URL = '/assets/icons/testrun_logo_small.svg';
const TESTRUN_LOGO_COLOR_URL = '/assets/icons/testrun_logo_color.svg';
const CLOSE_URL = '/assets/icons/close.svg';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  devices$!: Observable<Device[] | null>;
  @ViewChild('settingsDrawer') public settingsDrawer!: MatDrawer;
  @ViewChild('toggleSettingsBtn') public toggleSettingsBtn!: HTMLButtonElement;
  @ViewChild('navigation') public navigation!: ElementRef;
  @HostBinding('class.active-menu') isMenuOpen = false;
  interfaces: string[] = [];

  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer,
    private testRunService: TestRunService
  ) {
    testRunService.fetchDevices();
    this.matIconRegistry.addSvgIcon(
      'devices',
      this.domSanitizer.bypassSecurityTrustResourceUrl(DEVICES_LOGO_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'reports',
      this.domSanitizer.bypassSecurityTrustResourceUrl(REPORTS_LOGO_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'testrun_logo_small',
      this.domSanitizer.bypassSecurityTrustResourceUrl(TESTRUN_LOGO_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'testrun_logo_color',
      this.domSanitizer.bypassSecurityTrustResourceUrl(TESTRUN_LOGO_COLOR_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'close',
      this.domSanitizer.bypassSecurityTrustResourceUrl(CLOSE_URL)
    );
  }

  ngOnInit(): void {
    this.devices$ = this.testRunService.getDevices();
  }

  async closeSetting(): Promise<void> {
    return await this.settingsDrawer
      .close()
      .then(() => this.toggleSettingsBtn.focus());
  }

  async openSetting(): Promise<MatDrawerToggleResult> {
    return await this.settingsDrawer.open();
  }

  /**
   * Indicates, if side menu should be focused on keyboard navigation after menu is opened
   */
  focusNavigation = false;

  public toggleMenu(event: MouseEvent) {
    event.stopPropagation();
    this.isMenuOpen = !this.isMenuOpen;
    if (this.isMenuOpen) {
      this.focusNavigation = true; // user will be navigated to side menu on tab
    }
  }

  /**
   * When side menu is opened
   */
  skipToNavigation(event: Event) {
    if (this.focusNavigation) {
      event.preventDefault(); // if not prevented, second element will be focused
      this.navigation.nativeElement.firstChild.focus(); // focus first button on side
      this.focusNavigation = false; // user will be navigated according to normal flow on tab
    }
  }
  public openFeedbackModal() {
    // action TBD
  }

  openGeneralSettings() {
    this.testRunService
      .getSystemInterfaces()
      .pipe(take(1))
      .subscribe(async interfaces => {
        this.interfaces = interfaces;
        await this.settingsDrawer.open();
      });
  }
}
