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
  OnDestroy,
  OnInit,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  Device,
  DeviceAction,
  DeviceStatus,
  DeviceView,
  TestModule,
} from '../../model/device';
import { Subject, takeUntil, timer } from 'rxjs';
import { SimpleDialogComponent } from '../../components/simple-dialog/simple-dialog.component';
import { combineLatest } from 'rxjs/internal/observable/combineLatest';
import { FocusManagerService } from '../../services/focus-manager.service';
import { Routes } from '../../model/routes';
import { Router } from '@angular/router';
import { TestrunInitiateFormComponent } from '../testrun/components/testrun-initiate-form/testrun-initiate-form.component';
import { DevicesStore } from './devices.store';
import { DeviceQualificationFromComponent } from './components/device-qualification-from/device-qualification-from.component';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { DeviceItemComponent } from '../../components/device-item/device-item.component';
import { EmptyPageComponent } from '../../components/empty-page/empty-page.component';
import { ListLayoutComponent } from '../../components/list-layout/list-layout.component';
import { EntityActionResult } from '../../model/entity-action';
import { NoEntitySelectedComponent } from '../../components/no-entity-selected/no-entity-selected.component';
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Component({
  selector: 'app-device-repository',
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.scss'],
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    ScrollingModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatInputModule,
    DeviceItemComponent,
    EmptyPageComponent,
    ListLayoutComponent,
    NoEntitySelectedComponent,
    DeviceQualificationFromComponent,
  ],
  providers: [DevicesStore],
})
export class DevicesComponent implements OnInit, OnDestroy {
  readonly DeviceView = DeviceView;
  private readonly focusManagerService = inject(FocusManagerService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly liveAnnouncer = inject(LiveAnnouncer);
  private readonly route = inject(Router);
  private readonly devicesStore = inject(DevicesStore);
  dialog = inject(MatDialog);
  private element = inject(ElementRef);
  private destroy$: Subject<boolean> = new Subject<boolean>();
  viewModel$ = this.devicesStore.viewModel$;
  isOpenDeviceForm = false;

  ngOnInit(): void {
    combineLatest([
      this.devicesStore.devices$,
      this.devicesStore.isOpenAddDevice$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([devices, isOpenAddDevice]) => {
        if (
          !devices?.filter(device => device.status === DeviceStatus.VALID)
            .length &&
          isOpenAddDevice
        ) {
          this.openForm();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  menuItemClicked(
    { action, entity }: EntityActionResult<Device>,
    devices: Device[],
    testModules: TestModule[]
  ) {
    switch (action) {
      case DeviceAction.StartNewTestrun:
        this.openStartTestrun(entity, devices, testModules);
        break;
      case DeviceAction.Delete:
        this.openDeleteDialog(entity);
        break;
    }
  }

  openStartTestrun(
    selectedDevice: Device,
    devices: Device[],
    testModules: TestModule[]
  ): void {
    const dialogRef = this.dialog.open(TestrunInitiateFormComponent, {
      ariaLabel: 'Initiate testrun',
      data: {
        devices,
        device: selectedDevice,
        testModules,
      },
      autoFocus: 'dialog',
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'initiate-test-run-dialog',
    });

    dialogRef
      ?.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        if (status) {
          this.devicesStore.setStatus(status);
          // @ts-expect-error data layer is not null
          window.dataLayer.push({
            event: 'successful_testrun_initiation',
          });
          this.route.navigate([Routes.Testing]).then(() =>
            timer(100).subscribe(() => {
              this.focusManagerService.focusFirstElementInContainer();
            })
          );
        }
      });
  }

  async openForm(device: Device | null = null) {
    this.devicesStore.selectDevice(device);
    this.isOpenDeviceForm = true;
    await this.liveAnnouncer.announce('Device qualification form');
    this.focusManagerService.focusFirstElementInContainer(
      window.document.querySelector('app-device-qualification-from')
    );
  }

  save(device: Device, initialDevice: Device | null) {
    this.updateDevice(device, initialDevice, () => {
      this.devicesStore.selectDevice(device);
    });
  }

  discard() {
    this.openCloseDialog();
  }

  delete(device: Device) {
    this.openDeleteDialog(device);
  }

  private updateDevice(
    device: Device,
    initialDevice: Device | null = null,
    callback: () => void
  ) {
    if (initialDevice) {
      this.devicesStore.editDevice({
        device,
        mac_addr: initialDevice.mac_addr,
        onSuccess: callback,
      });
    } else {
      this.devicesStore.saveDevice({ device, onSuccess: callback });
    }
  }

  private openDeleteDialog(device: Device) {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      ariaLabel: 'Delete device',
      data: {
        title: 'Delete device?',
        content: `You are about to delete ${
          device.manufacturer + ' ' + device.model
        }. Are you sure?`,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'simple-dialog',
    });
    dialogRef?.beforeClosed().subscribe(deleteDevice => {
      if (deleteDevice) {
        this.devicesStore.deleteDevice({
          device: device,
          onDelete: (deviceIndex = 0) => {
            this.focusNextButton(deviceIndex);
          },
        });
      }
    });
  }

  private openCloseDialog(deviceIndex?: number) {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      ariaLabel: 'Close the Device menu',
      data: {
        title: 'Are you sure?',
        content: `By closing the device profile you will loose any new changes you have made to the device.`,
      },
      autoFocus: true,
      hasBackdrop: true,
      disableClose: true,
      panelClass: 'simple-dialog',
    });

    dialogRef?.beforeClosed().subscribe(close => {
      if (close) {
        this.isOpenDeviceForm = false;
        if (deviceIndex !== undefined) {
          this.focusSelectedButton(deviceIndex);
        } else {
          this.focusManagerService.focusFirstElementInContainer();
        }
      }
    });
  }

  private focusSelectedButton(index: number) {
    const selected = this.element.nativeElement.querySelectorAll(
      'app-device-item .button-edit'
    )[index];
    if (selected) {
      selected.focus();
    }
  }

  private focusNextButton(index: number) {
    this.changeDetectorRef.detectChanges();
    // Try to focus next device item, if exist
    const next = this.element.nativeElement.querySelectorAll(
      'app-device-item .button-edit'
    )[index];
    if (next) {
      next.focus();
    } else {
      // If next device item doest not exist, add device button should be focused
      const addButton =
        this.element.nativeElement.querySelector('.device-add-button');
      addButton?.focus();
    }
  }
}
