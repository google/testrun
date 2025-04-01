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
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  viewChild,
  inject,
  ViewChild,
  ChangeDetectorRef,
  Renderer2,
  HostListener,
} from '@angular/core';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { MatSidenavModule } from '@angular/material/sidenav';
import { StatusOfTestrun } from './model/testrun-status';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CalloutType } from './model/callout-type';
import { Routes } from './model/routes';
import { FocusManagerService } from './services/focus-manager.service';
import { Store } from '@ngrx/store';
import { AppState } from './store/state';
import { setIsOpenAddDevice, setIsOpenProfile } from './store/actions';
import { AppStore } from './app.store';
import { TestRunService } from './services/test-run.service';
import { filter, take } from 'rxjs/operators';
import { timer } from 'rxjs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TestingCompleteComponent } from './components/testing-complete/testing-complete.component';
import { BypassComponent } from './components/bypass/bypass.component';
import { ShutdownAppComponent } from './components/shutdown-app/shutdown-app.component';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { VersionComponent } from './components/version/version.component';
import { MatSelectModule } from '@angular/material/select';
import { WifiComponent } from './components/wifi/wifi.component';
import { MatRadioModule } from '@angular/material/radio';
import { CalloutComponent } from './components/callout/callout.component';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SideButtonMenuComponent } from './components/side-button-menu/side-button-menu.component';
import { Observable } from 'rxjs/internal/Observable';
import { of } from 'rxjs/internal/observable/of';
import { HelpTipComponent } from './components/help-tip/help-tip.component';
import { HelpTips } from './model/tip-config';

export interface AddMenuItem {
  icon?: string;
  svgIcon?: string;
  label: string;
  description?: string;
  onClick: () => void;
  disabled$: Observable<boolean>;
}

const DEVICES_RUN_URL = '/assets/icons/device_run.svg';
const TESTRUN_LOGO_URL = '/assets/icons/testrun_logo_small.svg';
const TESTRUN_LOGO_COLOR_URL = '/assets/icons/testrun_logo_color.svg';
const CLOSE_URL = '/assets/icons/close.svg';
const DRAFT_URL = '/assets/icons/draft.svg';
const PILOT_URL = '/assets/icons/pilot.svg';
const QUALIFICATION_URL = '/assets/icons/qualification.svg';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    MatButtonToggleModule,
    MatRadioModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSnackBarModule,
    SpinnerComponent,
    BypassComponent,
    VersionComponent,
    CalloutComponent,
    HelpTipComponent,
    ShutdownAppComponent,
    WifiComponent,
    TestingCompleteComponent,
    RouterModule,
    CommonModule,
    SideButtonMenuComponent,
  ],
  providers: [AppStore],
})
export class AppComponent implements AfterViewInit {
  private matIconRegistry = inject(MatIconRegistry);
  private domSanitizer = inject(DomSanitizer);
  private route = inject(Router);
  private store = inject<Store<AppState>>(Store);
  private readonly focusManagerService = inject(FocusManagerService);
  private testRunService = inject(TestRunService);
  private cdr = inject(ChangeDetectorRef);
  appStore = inject(AppStore);
  private renderer = inject(Renderer2);

  public readonly CalloutType = CalloutType;
  public readonly StatusOfTestrun = StatusOfTestrun;
  public readonly HelpTips = HelpTips;
  public readonly Routes = Routes;
  viewModel$ = this.appStore.viewModel$;

  readonly riskAssessmentLink = viewChild<ElementRef>('riskAssessmentLink');
  private skipCount = 0;
  @ViewChild('settingButton', { static: false }) settingButton!: MatButton;
  settingTipTarget!: HTMLElement;
  deviceTipTarget!: HTMLElement;
  testingTipTarget!: HTMLElement;
  riskAssessmentTipTarget!: HTMLElement;
  isClosedTip = false;

  @HostListener('mousedown')
  onMousedown() {
    this.renderer.addClass(document.body as HTMLElement, 'using-mouse');
  }

  @HostListener('keydown')
  onKeydown() {
    this.renderer.removeClass(document.body as HTMLElement, 'using-mouse');
  }

  navigateToRuntime = () => {
    this.route.navigate([Routes.Testing]);
    this.appStore.setIsOpenStartTestrun();
  };

  navigateToAddDevice = () => {
    this.route.navigate([Routes.Devices]);
    this.store.dispatch(setIsOpenAddDevice({ isOpenAddDevice: true }));
  };

  navigateToAddRiskAssessment = () => {
    this.route.navigate([Routes.RiskAssessment]);
    this.store.dispatch(setIsOpenProfile({ isOpenCreateProfile: true }));
  };

  menuItems: AddMenuItem[] = [
    {
      svgIcon: 'testrun_logo_small',
      label: 'Start Testing',
      description: 'Configure your testing tasks',
      onClick: this.navigateToRuntime,
      disabled$: this.appStore.testrunButtonDisabled$,
    },
    {
      icon: 'home_iot_device',
      label: 'Create new device',
      onClick: this.navigateToAddDevice,
      disabled$: of(false),
    },
    {
      icon: 'rule',
      label: 'Create new Risk profile',
      onClick: this.navigateToAddRiskAssessment,
      disabled$: of(false),
    },
  ];

  constructor() {
    this.appStore.getDevices();
    this.appStore.getRiskProfiles();
    this.appStore.getSystemStatus();
    this.appStore.getReports();
    this.appStore.getTestModules();
    this.appStore.getNetworkAdapters();
    this.appStore.getInterfaces();
    this.appStore.getSystemConfig();
    this.matIconRegistry.addSvgIcon(
      'device_run',
      this.domSanitizer.bypassSecurityTrustResourceUrl(DEVICES_RUN_URL)
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
    this.matIconRegistry.addSvgIcon(
      'draft',
      this.domSanitizer.bypassSecurityTrustResourceUrl(DRAFT_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'pilot',
      this.domSanitizer.bypassSecurityTrustResourceUrl(PILOT_URL)
    );
    this.matIconRegistry.addSvgIcon(
      'qualification',
      this.domSanitizer.bypassSecurityTrustResourceUrl(QUALIFICATION_URL)
    );
    effect(() => {
      if (this.skipCount === 0 && this.riskAssessmentLink()) {
        this.riskAssessmentLink()?.nativeElement.focus();
      } else if (this.skipCount > 0) {
        this.skipCount--;
      }
    });
  }

  ngAfterViewInit() {
    this.settingTipTarget = this.settingButton._elementRef.nativeElement;
    this.deviceTipTarget = document.querySelector(
      '.app-sidebar-button.app-sidebar-button-devices'
    ) as HTMLElement;
    this.testingTipTarget = document.querySelector(
      '.app-sidebar-button.app-sidebar-button-testrun'
    ) as HTMLElement;

    this.riskAssessmentTipTarget = document.querySelector(
      '.app-sidebar-button.app-sidebar-button-risk-assessment'
    ) as HTMLElement;

    this.viewModel$
      .pipe(
        filter(({ isStatusLoaded }) => isStatusLoaded === true),
        take(1)
      )
      .subscribe(({ systemStatus }) => {
        if (systemStatus === StatusOfTestrun.InProgress) {
          // link should not be focused after page is just loaded
          this.skipCount = 1;
        }
      });

    this.cdr.detectChanges();
  }

  get isDevicesRoute(): boolean {
    return this.route.url === Routes.Devices;
  }

  navigateToDeviceRepository(): void {
    this.route.navigate([Routes.Devices]);
  }

  navigateToRiskAssessment(): void {
    this.route.navigate([Routes.RiskAssessment]).then(() => {
      this.appStore.setFocusOnPage(
        window.document.querySelector('app-risk-assessment')
      );
    });
  }

  navigateToSettings(): void {
    this.route.navigate([Routes.Settings]).then(() => {
      timer(100).subscribe(() => {
        this.appStore.setFocusOnPage(
          window.document.querySelector('app-general-settings')
        );
      });
    });
  }

  onCLoseTip(isClosed: boolean): void {
    this.isClosedTip = isClosed;
    const helpTipButton = window.document.querySelector(
      '.app-toolbar-button-help-tips'
    ) as HTMLButtonElement;
    const helpTipEl = window.document.querySelector('app-help-tip');
    timer(100).subscribe(() => {
      if (isClosed) {
        helpTipButton.focus();
      } else {
        this.focusManagerService.focusFirstElementInContainer(helpTipEl);
      }
    });
  }
  consentShown() {
    this.appStore.setContent();
  }

  isTestrunInProgress(status?: string | null) {
    return this.testRunService.testrunInProgress(status);
  }

  onNavigationClick() {
    this.route.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        take(1)
      )
      .subscribe(() => {
        this.appStore.setFocusOnPage(null);
      });
  }

  calloutClosed(id: string | null) {
    if (id) {
      this.appStore.setCloseCallout(id);
      timer(100).subscribe(() => {
        this.focusManagerService.focusFirstElementInContainer();
      });
    }
  }
}
