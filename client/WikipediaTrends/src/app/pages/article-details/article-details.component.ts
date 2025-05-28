import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AppService } from '../../services/app.service';
import ArticleData from '../../model/ArticleData';

@Component({
  selector: 'app-article-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './article-details.component.html',
  styleUrl: './article-details.component.css',
})
export class ArticleDetailsComponent implements OnInit {
  article!: ArticleData;
  isLoading = true;
  error: string | null = null;

  private route = inject(ActivatedRoute);
  private appService = inject(AppService);
  public location = inject(Location);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.location.back();
      return;
    }

    
    this.appService.getArticleData(id, null).subscribe({
      next: (data) => {
        this.article = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch article:', err);
        this.error = 'Failed to load article data.';
        this.isLoading = false;
      },
    });
  }
}
