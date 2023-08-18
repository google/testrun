import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Device} from '../../model/device';

@Component({
  selector: 'app-device-item',
  templateUrl: './device-item.component.html',
  styleUrls: ['./device-item.component.scss'],
})
export class DeviceItemComponent {
  @Input() device!: Device;
  @Output() itemClicked = new EventEmitter<Device>();

  itemClick(): void {
    this.itemClicked.emit(this.device);
  }
}
