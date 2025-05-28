import {
  Component,
  computed,
  effect,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AppService } from '../../services/app.service';
import ArticleDataShort from '../../model/ArticleDataShort';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  private appService = inject(AppService);
  page = signal(1);
  pageSize = 25;
  totalPages = 0;
  newTitle = '';
  isLoading = true;
  error: string | null = null;

  constructor(private router: Router) {
    effect(() => {
      const total = this.appService.articles().length;
      this.totalPages = Math.ceil(total / this.pageSize);
    });
  }

  ngOnDestroy(): void {
    this.appService.clearAllData();
  }
  ngOnInit(): void {
    this.appService.getAllArticles().subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch articles:', err);
        this.error = 'Failed to load articles.';
        this.isLoading = false;
      },
    });
  }

  // Expose the full list directly from the signal
  get articles(): ArticleDataShort[] {
    return this.appService.articles();
  }

  // Get the current page's slice (pagination view only)
  get paginatedArticles(): ArticleDataShort[] {
    const start = (this.page() - 1) * this.pageSize;
    return this.articles.slice(start, start + this.pageSize);
  }

  onAdd(): void {
    this.appService.addArticleData(this.newTitle.replaceAll(' ', '_'));
    this.newTitle = '';
  }

  changePage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page.set(p);
  }

  goToArticle(article: ArticleDataShort): void {
    this.router.navigate(['article/', article.id]);
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }
}
