import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { SearchComponent } from './pages/search/search.component';
import { SearchTrendsComponent } from './pages/search-trends/search-trends.component';
import { ArticleDetailsComponent } from './pages/article-details/article-details.component';
import { SearchTrendsComparisonComponent } from './pages/search-trends-comparison/search-trends-comparison.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'search', component: SearchComponent },
  { path: 'trends', component: SearchTrendsComponent },
  { path: 'trends-comparison', component: SearchTrendsComparisonComponent },
  { path: 'article/:id', component: ArticleDetailsComponent },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
