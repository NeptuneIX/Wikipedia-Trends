import {
  Component,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import ArticleData from '../../model/ArticleData';
import { AppService } from '../../services/app.service';
import ArticleDataShort from '../../model/ArticleDataShort';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchComponent implements   OnDestroy {
  title = '';
  categories = '';
  description = '';
  private appService = inject(AppService);
  page = signal(1);
  pageSize = 25;
  totalPages = 0;
  isLoading = false;
  error: string | null = null;

  constructor(private router: Router) {
    // Recalculate total pages reactively whenever articles change
    effect(() => {
      const total = this.appService.articles().length;
      this.totalPages = Math.ceil(total / this.pageSize);
    });
  }

  ngOnDestroy(): void {
    this.appService.clearAllData();
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

  onSearch(): void {
    this.isLoading = true;
    this.appService.getArticles(this.title, this.description, this.categories).subscribe({
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

  // loadArticles(): void {
  //   // Dummy data
  //   this.articles = Array.from({ length: 30 }, (_, i) => ({
  //     id: i + 1,
  //     title: `Sample Article ${i + 1}`,
  //     description: `This is a description for article ${
  //       i + 1
  //     }. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
  //     categories: 'Tech,History,Science',
  //     datesSearchedViews: '2023-01-01,2023-02-01',
  //     datesSearchedEdits: '2023-01-02,2023-02-02',
  //   }));

  //   this.totalPages = Math.ceil(this.articles.length / this.pageSize);
  // }

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
