import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {Observable} from 'rxjs/internal/Observable';

@Component({
  selector: 'app-progress-breadcrumbs',
  templateUrl: './progress-breadcrumbs.component.html',
  styleUrls: ['./progress-breadcrumbs.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressBreadcrumbsComponent {
  @Input() breadcrumbs$!: Observable<string[]>;
}
