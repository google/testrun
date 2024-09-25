import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TestrunStatus } from '../../model/testrun-status';

@Component({
  selector: 'app-report-action',
  standalone: true,
  imports: [CommonModule],
  template: '',
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportActionComponent {
  @Input() data!: TestrunStatus;
  constructor(private datePipe: DatePipe) {}

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
