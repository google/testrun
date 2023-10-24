import {Component, OnInit} from '@angular/core';
import {LoaderService} from '../../services/loader.service';
import {CommonModule} from '@angular/common';
import {Observable} from 'rxjs/internal/Observable';

@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class SpinnerComponent implements OnInit {
  loader$!: Observable<boolean>;

  constructor(public loaderService: LoaderService) {
  }

  ngOnInit() {
    this.loader$ = this.loaderService.getLoading();
  }
}
