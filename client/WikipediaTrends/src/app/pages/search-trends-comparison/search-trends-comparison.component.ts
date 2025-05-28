import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  ChartDataset,
} from 'chart.js';
import { AppService } from '../../services/app.service';
import TrendPoint from '../../model/TrendPoint';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip
);

@Component({
  selector: 'app-search-trends-comparison',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-trends-comparison.component.html',
  styleUrls: ['./search-trends-comparison.component.css'],
})
export class SearchTrendsComparisonComponent implements AfterViewInit {
  @ViewChild('chartCanvas') chartRef!: ElementRef<HTMLCanvasElement>;
  private appService = inject(AppService);

  titles = ['', '', '', '', ''];
  initialYear = new Date().getFullYear();
  initialMonth = new Date().getMonth() + 1;
  offsetMonths = 6;
  offsetDays = 0;
  metric: 'popularity' | 'edits' = 'popularity';

  private chart!: Chart;
  showServerError = false;

  ngAfterViewInit() {
    this.initChart();
  }

  onCompare() {
    this.showServerError = false;
    const validTitles = this.titles
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);
    if (!validTitles.length) return;

    const apiCall =
      this.metric === 'edits'
        ? this.appService.getEditDataBulk
        : this.appService.getViewDataBulk;

    apiCall
      .call(
        this.appService,
        validTitles.map((t) => t.replaceAll(' ', '_')),
        this.initialYear,
        this.initialMonth,
        this.offsetMonths,
        this.offsetDays
      )
      .subscribe({
        next: (data: TrendPoint[][]) => {
          try {
            this.updateChart(data, validTitles);
          } catch (e) {
            console.error(e);
            this.showServerError = true;
          }
        },
        error: () => {
          console.log('hi');
          this.showServerError = true;
        },
      });
  }

  private initChart(): void {
    this.chart = new Chart(this.chartRef.nativeElement, {
      type: 'line',
      data: {
        labels: [],
        datasets: [],
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
          },
        },
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
      },
    });
  }

  private updateChart(allData: TrendPoint[][], labels: string[]) {
    // Get full month range from all datasets
    const allMonths = new Set<string>();
    allData.forEach((data) =>
      data.forEach((point) => allMonths.add(point.month))
    );

    const sortedMonths = Array.from(allMonths).sort(); // YYYY-MM order
    const datasets: ChartDataset<'line'>[] = allData
      .map((dataset, i) => {
        if (dataset.length === 0) return undefined;

        const monthMap = new Map(
          dataset.map((point) => [point.month, point.count])
        );

        const completeData = sortedMonths.map(
          (month) => monthMap.get(month) ?? 0
        );

        const color = this.getColor(i);
        return {
          label: labels[i],
          data: completeData,
          borderColor: color,
          backgroundColor: this.transparentize(color, 0.4),
          tension: 0.3,
          pointRadius: 3,
          fill: false,
        } as ChartDataset<'line'>;
      })
      .filter((ds): ds is ChartDataset<'line'> => ds !== undefined); // Type guard

    this.chart.data = {
      labels: sortedMonths,
      datasets,
    };
    this.chart.update();
  }

  private getColor(index: number): string {
    const colors = ['#007bff', '#dc3545', '#28a745', '#ffc107', '#6f42c1'];
    return colors[index % colors.length];
  }

  private transparentize(color: string, opacity: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  trackByIndex(index: number, item: string): number {
    return index;
  }
}
