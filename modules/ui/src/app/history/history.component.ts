import {Component, OnInit} from '@angular/core';
import {TestRunService} from '../test-run.service';
import {Observable} from 'rxjs/internal/Observable';
import {TestrunStatus} from '../model/testrun-status';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {
  history$!: Observable<TestrunStatus[]>;
  displayedColumns: string[] = ['#', 'started', 'finished', 'manufacturer', 'model', 'status', 'report']

  constructor(private testRunService: TestRunService) {
    this.testRunService.fetchHistory();
  }

  ngOnInit() {
    this.history$ = this.testRunService.getHistory();
  }
}
