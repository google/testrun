import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TestrunStatus } from '../../model/testrun-status';
import { TestRunService } from '../../services/test-run.service';

@Component({
  selector: 'app-report-action',

  imports: [],
  template: '',
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportActionComponent {
  private datePipe = inject(DatePipe);
  private testRunService = inject(TestRunService);

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

  getReportUrl(data: TestrunStatus) {
    return this.testRunService.getReportLink(data.report);
  }
}
