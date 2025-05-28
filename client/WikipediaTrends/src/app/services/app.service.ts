import { DestroyRef, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment'; // Adjust path if needed
import { catchError, forkJoin, Observable, of, tap } from 'rxjs';

import { HttpParams } from '@angular/common/http';
import ArticleDataShort from '../model/ArticleDataShort';
import ArticleData from '../model/ArticleData';
import TrendPoint from '../model/TrendPoint';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private baseUrl = environment.baseUrl;

  public articles = signal<ArticleDataShort[]>([]);
  public curArticle = signal<ArticleData | null>(null);
  public trendData = signal<TrendPoint[]>([]);

  constructor(private http: HttpClient) {}

  getArticleData(id: string | null, title: string | null) {
    let params;

    if (title == null) {
      params = this.setParams({ article_id: id });
    } else {
      params = this.setParams({ article_title: title });
    }
    return this.http
      .get<ArticleData>(`${this.baseUrl}/article-data`, { params })
      .pipe(
        tap((article) => {
          this.curArticle.set(article);
        }),
        catchError((err) => {
          console.error('Failed to fetch articles:', err);
          return of();
        })
      );
  }

  getAllArticles() {
    return this.http
      .get<ArticleDataShort[]>(`${this.baseUrl}/all-article-data`)
      .pipe(
        tap((newArticles) => {
          this.articles.set(newArticles);
        }),
        catchError((err) => {
          console.error('Failed to fetch articles:', err);
          return of();
        })
      );
  }

  getArticles(title: string, description: string, categories: string) {
    const params = this.setParams({
      title: title,
      description: description,
      categories: categories,
    });
    return this.http
      .get<ArticleDataShort[]>(`${this.baseUrl}/articles`, { params })
      .pipe(
        tap((newArticles) => {
          this.articles.set(newArticles);
        }),
        catchError((err) => {
          console.error('Failed to fetch articles:', err);

          return of();
        })
      );
  }

  getViewData(
    title: string,
    initialYear: number,
    initialMonth: number,
    offsetMonths: number,
    offsetDays: number
  ) {
    const params = this.setParams({
      title: title,
      initialYear: initialYear,
      initialMonth: initialMonth,
      offsetMonths: offsetMonths,
      offsetDays: offsetDays,
    });
    return this.http
      .get<TrendPoint[]>(`${this.baseUrl}/views`, { params })
      .pipe(
        tap((viewTrendData) => {
          this.trendData.set(viewTrendData);
        }),
        catchError((err) => {
          console.error('Failed to fetch articles:', err);

          return of([]);
        })
      );
  }

  getViewDataBulk(
    titles: string[],
    initialYear: number,
    initialMonth: number,
    offsetMonths: number,
    offsetDays: number
  ): Observable<TrendPoint[][]> {
    const requests: Observable<TrendPoint[]>[] = titles.map(
      (title: string): Observable<TrendPoint[]> => {
        const params = this.setParams({
          title,
          initialYear,
          initialMonth,
          offsetMonths,
          offsetDays,
        });

        return this.http
          .get<TrendPoint[]>(`${this.baseUrl}/views`, { params })
          .pipe(
            catchError((err): Observable<TrendPoint[]> => {
              console.error(`Error fetching data for title "${title}":`, err);
              return of([]); // Return empty array on error
            })
          );
      }
    );

    return forkJoin(requests) as Observable<TrendPoint[][]>;
  }

  getEditData(
    title: string,
    initialYear: number,
    initialMonth: number,
    offsetMonths: number,
    offsetDays: number
  ) {
    const params = this.setParams({
      title: title,
      initialYear: initialYear,
      initialMonth: initialMonth,
      offsetMonths: offsetMonths,
      offsetDays: offsetDays,
    });
    return this.http
      .get<TrendPoint[]>(`${this.baseUrl}/edits`, { params })
      .pipe(
        tap((viewTrendData) => {
          this.trendData.set(viewTrendData);
        }),
        catchError((err) => {
          console.error('Failed to fetch article edit data:', err);

          return of([]);
        })
      );
  }

  getEditDataBulk(
    titles: string[],
    initialYear: number,
    initialMonth: number,
    offsetMonths: number,
    offsetDays: number
  ): Observable<TrendPoint[][]> {
    const requests: Observable<TrendPoint[]>[] = titles.map(
      (title: string): Observable<TrendPoint[]> => {
        const params = this.setParams({
          title,
          initialYear,
          initialMonth,
          offsetMonths,
          offsetDays,
        });

        return this.http
          .get<TrendPoint[]>(`${this.baseUrl}/edits`, { params })
          .pipe(
            catchError((err): Observable<TrendPoint[]> => {
              console.error(`Error fetching data for title "${title}":`, err);
              return of([]); // Return empty array on error
            })
          );
      }
    );

    return forkJoin(requests) as Observable<TrendPoint[][]>;
  }

  addArticleData(title: string) {
    const params = this.setParams({ title: title });
    return this.http
      .post<{ message: string; article_title: string }>(
        `${this.baseUrl}/fetch-article-data`,
        {},
        { params }
      )
      .subscribe({
        next: (body) => {
          // Get the article we just indexed, then add it to the existing array of articles to save on performance
          this.getArticleData(null, body?.article_title).subscribe({
            next: () => {
              if (this.curArticle() !== null) {
                this.articles.set([
                  ...this.articles(),
                  this.curArticle() as ArticleDataShort
                ]);
              }
            },
          });
          
        },
      });
  }

  addViewData(
    title: string,
    initialYear: number,
    initialMonth: number,
    offsetMonths: number,
    offsetDays: number
  ) {
    const params = this.setParams({
      title: title,
      initialYear: initialYear,
      initialMonth: initialMonth,
      offsetMonths: offsetMonths,
      offsetDays: offsetDays,
    });
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/fetch-views`,
      {},
      { params }
    );
  }

  addEditData(
    title: string,
    initialYear: number,
    initialMonth: number,
    offsetMonths: number,
    offsetDays: number
  ) {
    const params = this.setParams({
      title: title,
      initialYear: initialYear,
      initialMonth: initialMonth,
      offsetMonths: offsetMonths,
      offsetDays: offsetDays,
    });
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/fetch-edits`,
      {},
      { params }
    );
  }

  setParams(parameters: { [key: string]: any }): HttpParams {
    let params = new HttpParams();

    for (const key in parameters) {
      if (parameters[key] !== undefined && parameters[key] !== null) {
        params = params.set(key, parameters[key]);
      }
    }

    return params;
  }

  clearAllData() {
    this.articles.set([]);
    this.curArticle.set(null);
    this.trendData.set([]);
  }
}
