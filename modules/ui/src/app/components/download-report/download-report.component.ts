import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {TestrunStatus} from '../../model/testrun-status';
import {CommonModule, DatePipe} from '@angular/common';

@Component({
  selector: 'app-download-report',
  templateUrl: './download-report.component.html',
  styleUrls: ['./download-report.component.scss'],
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DownloadReportComponent {
  @Input() data!: TestrunStatus;

  constructor(private datePipe: DatePipe) {
  }

  getTestRunId(data: TestrunStatus) {
    return `${data.device.manufacturer} ${data.device.model} ${data.device.firmware} ${this.getFormattedDateString(data.started)}`;
  }

  getReportTitle(data: TestrunStatus) {
    return `${data.device.manufacturer} ${data.device.model} ${data.device.firmware} ${data.status} ${this.getFormattedDateString(data.started)}`.replace(/ /g, "_").toLowerCase();
  }

  getFormattedDateString(date: string | null) {
    return date ? this.datePipe.transform(date, 'd MMM y H:mm') : '';
  }

}
