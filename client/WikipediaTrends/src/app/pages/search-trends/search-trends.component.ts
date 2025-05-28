import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  inject,
  computed,
  effect,
  runInInjectionContext,
  EnvironmentInjector,
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
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip
);

import { AppService } from '../../services/app.service';

type ChartDataPoint = { x: string; y: number };

@Component({
  selector: 'app-search-trends',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-trends.component.html',
  styleUrls: ['./search-trends.component.css'],
})
export class SearchTrendsComponent implements AfterViewInit {
  private envInjector = inject(EnvironmentInjector);
  // 📝 Form fields
  title = '';
  initialYear = new Date().getFullYear();
  initialMonth = new Date().getMonth() + 1;
  offsetMonths = 6;
  offsetDays = 0;
  metric: 'edits' | 'popularity' = 'popularity';
  isLoading = false;

  private appService = inject(AppService);

  // 📊 Chart
  @ViewChild('chartCanvas') chartRef!: ElementRef<HTMLCanvasElement>;
  private chart!: Chart<'line', (ChartDataPoint | null)[], unknown>;

  data = computed<ChartDataPoint[]>(() =>
    this.appService.trendData().map((point) => ({
      x: point.month,
      y: point.count,
    }))
  );

  // 🚦 State
  volatilityLabel = '';
  popularityLabel = '';
  showNoResults = false;
  showServerError = false;
  showChart = false;
  fetchMessage: string | null = null;

  ngAfterViewInit(): void {
    this.initChart([]);
  }

  onFetchData(): void {
    this.isLoading = true;
    this.fetchMessage = null;
    if (this.metric === 'edits') {
      this.appService
        .addEditData(
          this.title.replaceAll(' ', '_'),
          this.initialYear,
          this.initialMonth,
          this.offsetMonths,
          this.offsetDays
        )
        .subscribe({
          next: (res) => {
            this.fetchMessage = res.message;
            this.isLoading = false;
          },
          error: (err) => {
            this.fetchMessage = err?.message ?? 'Failed to fetch data. Please try again.';
            this.isLoading = false;
          },
        });
    } else {
      this.appService
        .addViewData(
          this.title.replaceAll(' ', '_'),
          this.initialYear,
          this.initialMonth,
          this.offsetMonths,
          this.offsetDays
        )
        .subscribe({
          next: (res) => {
            this.fetchMessage = res?.message;
            this.isLoading = false;
          },
          error: (err) => {
            this.fetchMessage = err?.error?.message ?? 'Failed to fetch data. Please try again.';
            this.isLoading = false;
          },
        });
    }
  }

  onSearch(): void {
    this.resetState();

    if (this.metric === 'edits') {
      this.appService
        .getEditData(
          this.title.replaceAll(' ', '_'),
          this.initialYear,
          this.initialMonth,
          this.offsetMonths,
          this.offsetDays
        )
        .subscribe({
          next: () => this.completeUpdate(),
        });
    } else {
      this.appService
        .getViewData(
          this.title.replaceAll(' ', '_'),
          this.initialYear,
          this.initialMonth,
          this.offsetMonths,
          this.offsetDays
        )
        .subscribe({
          next: () => this.completeUpdate(),
        });
    }
  }

  public completeUpdate() {
    const data = this.data();

    if (!data.length) {
      this.showNoResults = true;
      return;
    }

    try {
      this.updateChart(data);
      this.computeStats(data);
      this.showChart = true;
    } catch (err) {
      console.error(err);
      this.showServerError = true;
    }
  }

  private resetState(): void {
    this.showNoResults = false;
    this.showServerError = false;
    this.showChart = false;
    this.isLoading = false;
    this.volatilityLabel = '';
    this.popularityLabel = '';
  }

  private initChart(initialData: ChartDataPoint[]): void {
    this.chart = new Chart<'line', (ChartDataPoint | null)[], unknown>(
      this.chartRef.nativeElement,
      {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'Example',
              data: initialData,
            },
          ],
        },
        options: {
          parsing: false,
          scales: {
            x: {
              type: 'category',
            },
            y: {
              beginAtZero: true,
            },
          },
        },
      }
    );
  }

  private updateChart(data: ChartDataPoint[]): void {
    this.chart.data = {
      labels: data.map((point) => point.x), // ensure labels get reset
      datasets: [
        {
          label: this.metric === 'popularity' ? 'Popularity' : 'Edit Count',
          data: data,
          borderColor: 'blue',
          backgroundColor: 'rgba(0, 123, 255, 0.2)',
          tension: 0.3,
          pointRadius: 3,
          fill: false,
        },
      ],
    };
    this.chart.update();
  }

  private computeStats(data: ChartDataPoint[]): void {
    const counts = data.map((d) => d.y);
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variation = (max - min) / avg;

    // Volatility
    this.volatilityLabel = this.labelByThreshold(
      variation,
      [0.1, 0.3],
      ['Low', 'Medium', 'High']
    );

    // Popularity
    const threshold = this.metric === 'popularity' ? 50000 : 500;
    const averageCount = Math.round(avg);
    this.popularityLabel = this.labelByThreshold(
      averageCount,
      [threshold / 2, threshold],
      ['Low', 'Medium', 'High']
    );
  }

  private labelByThreshold(
    value: number,
    [low, high]: [number, number],
    [lowText, midText, highText]: [string, string, string]
  ): string {
    if (value < low) {
      return `<span class="text-danger">${lowText}</span>`;
    } else if (value < high) {
      return `<span class="text-warning">${midText}</span>`;
    } else {
      return `<span class="text-success">${highText}</span>`;
    }
  }
}
