using Microsoft.EntityFrameworkCore;
using WikipediaArticlePropagationES.Model;

namespace WikipediaArticlePropagationES
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<ArticleData> ArticleData { get; set; }
    }


}
