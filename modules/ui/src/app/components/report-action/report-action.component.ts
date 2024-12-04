import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TestrunStatus } from '../../model/testrun-status';

@Component({
  selector: 'app-report-action',

  imports: [CommonModule],
  template: '',
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportActionComponent {
  private datePipe = inject(DatePipe);

  @Input() data!: TestrunStatus;

  getTestRunId(data: TestrunStatus) {
    if (!data.device) {
      return '';
    }
    return `${data.device.manufacturer} ${data.device.model} ${
      data.device.firmware
    } ${this.getFormattedDateString(data.started)}`;
  }

  getFormattedDateString(date: string | null) {
    return date ? this.datePipe.transform(date, 'd MMM y H:mm') : '';
  }
}
