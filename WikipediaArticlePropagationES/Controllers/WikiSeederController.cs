using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nest;
using WikipediaArticlePropagationES;
using WikipediaArticlePropagationES.Model;

[ApiController]
[Route("api/[controller]")]
public class WikiSeederController : ControllerBase
{
    private readonly IElasticClient _elasticClient;
    private readonly WikipediaService _wikiService;
    private readonly AppDbContext _dbContext;

    public WikiSeederController(IElasticClient elasticClient, IConfiguration config, AppDbContext dbContext)
    {
        _elasticClient = elasticClient;
        _wikiService = new WikipediaService(config.GetValue<string>("WikipediaApiKey")); // Move to config later if you want
        _dbContext = dbContext;
    }

    [HttpPost("fetch-edits")]
    public async Task<IActionResult> FetchEdits([FromQuery] string title, [FromQuery] int initialYear = 2025,
    [FromQuery] int initialMonth = 5, [FromQuery] int offsetMonths = 12, [FromQuery] int offsetDays = 0)
    {
        DateTime endUtc = new DateTime(initialYear, initialMonth, 1);
        DateTime startUtc = endUtc.AddMonths(-offsetMonths).AddDays(-offsetDays);

        // Filtering dates

        var articleData = await _dbContext.ArticleData.FirstOrDefaultAsync(a => a.Title == title);

        if (articleData == null)
        {
            return NotFound(new { message = $"No article found with the title '{title}'." });
        }

        var datesToSearch = articleData.DatesSearchedEdits;

        // Filtering through the saved date ranges to see if there is any overlaps
        Tuple<DateTime, DateTime, bool> filteredDate = Tuple.Create(startUtc, endUtc, true);

        if (!string.IsNullOrWhiteSpace(datesToSearch))
        {
            filteredDate = await _wikiService.SearchArticleSavedDates(startUtc, endUtc, datesToSearch);
        }

        if (!filteredDate.Item3) return BadRequest(new { message = $"Data for date range has already been fetched." });

        // After filtering update to account for any removed overlaps
        startUtc = filteredDate.Item1;
        endUtc = filteredDate.Item2;

        string rvstart = startUtc.ToString("yyyy-MM-ddTHH:mm:ssZ");
        string rvend = endUtc.ToString("yyyy-MM-ddTHH:mm:ssZ");
        string baseUrl = $"https://en.wikipedia.org/w/api.php?action=query&prop=revisions&titles={title}&rvlimit=500&rvstart={rvstart}&rvend={rvend}&rvdir=newer&format=json";

        var allEdits = new List<ArticleEdit>();
        string? nextContinue = null;

        do
        {
            var url = baseUrl + (nextContinue != null ? $"&rvcontinue={nextContinue}" : "");
            var data = await _wikiService.GetDataAsync(url);

            if (data == null) return BadRequest(new { message = $"No data found or request failed for {title}." });

            var pages = data["query"]?["pages"];
            if (pages == null) break;

            foreach (var page in pages.Children())
            {
                var revisions = page.First["revisions"];
                if (revisions == null) continue;

                foreach (var rev in revisions)
                {
                    var edit = new ArticleEdit
                    {
                        ArticleTitle = title,
                        EditTimestamp = DateTime.Parse(rev["timestamp"]?.ToString() ?? DateTime.UtcNow.ToString()),
                        EditorUsername = rev["user"]?.ToString() ?? "unknown",
                        EditComment = rev["comment"]?.ToString() ?? "no comment",
                    };

                    Console.WriteLine(title + ' ' + rev["timestamp"] + ' ' + rev["user"] + " " + rev["comment"]);

                    allEdits.Add(edit);
                }
            }

            nextContinue = data["continue"]?["rvcontinue"]?.ToString();

        } while (nextContinue != null);

        foreach (var edit in allEdits)
        {
            await _elasticClient.IndexAsync(edit, i => i.Index("articles-edits"));
        }

        if (articleData != null)
        {
            string range = $"{rvstart} - {rvend}";
            if (string.IsNullOrWhiteSpace(articleData.DatesSearchedEdits))
                articleData.DatesSearchedEdits = range;
            else
                articleData.DatesSearchedEdits += $",{range}";

            await _dbContext.SaveChangesAsync();
        }

        return Ok(new { message = $"Indexed {allEdits.Count} edits for '{title}' for date range {startUtc.ToString("yyyy/MM/dd")} - {endUtc.ToString("yyyy/MM/dd")}" });
    }

    [HttpPost("fetch-views")]
    public async Task<IActionResult> FetchViews([FromQuery] string title, [FromQuery] int initialYear = 2025, [FromQuery] int initialMonth = 5, [FromQuery] int offsetMonths = 12, [FromQuery] int offsetDays = 0)
    {
        DateTime startUtc = new DateTime(initialYear, initialMonth, 1, 0, 0, 0, DateTimeKind.Utc)
            .AddMonths(-offsetMonths)
            .AddDays(-offsetDays);
        DateTime endUtc = new DateTime(initialYear, initialMonth, 1, 0, 0, 0, DateTimeKind.Utc);

        // Filtering dates


        var articleData = await _dbContext.ArticleData.FirstOrDefaultAsync(a => a.Title == title);

        if (articleData == null)
        {
            return NotFound(new { message = $"No article found with the title '{title}'." });
        }

        var datesToSearch = articleData.DatesSearchedViews;

        // Filtering through the saved date ranges to see if there is any overlaps
        Tuple<DateTime, DateTime, bool> filteredDate = Tuple.Create(startUtc, endUtc, true);

        if (!string.IsNullOrWhiteSpace(datesToSearch))
        {
            filteredDate = await _wikiService.SearchArticleSavedDates(startUtc, endUtc, datesToSearch);
        }

        if (!filteredDate.Item3) return BadRequest(new { message = $"Data for date range has already been fetched." });

        // After filtering update to account for any removed overlaps
        startUtc = filteredDate.Item1;
        endUtc = filteredDate.Item2;

        // For Wikimedia API
        string dateFrom = startUtc.ToString("yyyyMMdd");
        string dateTo = endUtc.ToString("yyyyMMdd");

        string dateFromUtc = startUtc.ToString("yyyy-MM-ddTHH:mm:ssZ");
        string dateToUtc = endUtc.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ");

        var url = $"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/{title}/monthly/{dateFrom}/{dateTo}";
        var data = await _wikiService.GetDataAsync(url);
        if (data == null) return BadRequest(new { message = $"No data found or request failed for {title}." });

        var items = data["items"];

        foreach (var item in items)
        {
            var view = new ArticleView
            {
                ArticleTitle = title,
                PageviewDate = DateTime.ParseExact(item["timestamp"]?.ToString() ?? "", "yyyyMMddHH", null),
                Views = (int?)item["views"] ?? 0,
            };

            Console.WriteLine(title + ' ' + item["timestamp"] + ' ' + item["views"]);

            await _elasticClient.IndexAsync(view, i => i.Index("articles-views"));
        }

        if (articleData != null)
        {
            string range = $"{dateFromUtc} - {dateToUtc}";
            if (string.IsNullOrWhiteSpace(articleData.DatesSearchedViews))
                articleData.DatesSearchedViews = range;
            else
                articleData.DatesSearchedViews += $",{range}";

            await _dbContext.SaveChangesAsync();
        }

        return Ok(new { message = $"Fetched & indexed pageviews for '{title}' for date range {startUtc.ToString("yyyy/MM/dd")} - {endUtc.ToString("yyyy/MM/dd")}" });
    }

    [HttpPost("fetch-article-data")]
    public async Task<IActionResult> FetchArticleData([FromQuery] string title)
    {
        // Check if the article already exists
        bool articleExists = await _dbContext.ArticleData.AnyAsync(a => a.Title == title);
        if (articleExists)
        {
            return Conflict(new { message = $"Article with title '{title}' already exists." });
        }


        var url = $"https://en.wikipedia.org/w/api.php?action=query&prop=categories|description&titles={title}&format=json&cllimit=max";
        var data = await _wikiService.GetDataAsync(url);
        if (data == null) return BadRequest(new { message = $"No data found or request failed for {title}." });

        var pages = data["query"]?["pages"];
        if (pages == null || !pages.HasValues) return BadRequest(new { message = "Invalid response from Wikipedia" });

        foreach (var page in pages.Children())
        {
            var categoriesArray = page.First["categories"];
            var description = page.First["description"]?.ToString() ?? "No description";

            var categories = categoriesArray != null
                ? string.Join(",", categoriesArray
                    .Select(category => category["title"]?.ToString()?.Replace("Category:", "") ?? "Unknown"))
                : "";

            var article = new ArticleData
            {
                Title = title,
                Description = description,
                Categories = categories,
                DatesSearchedViews = "",
                DatesSearchedEdits = ""
            };

            _dbContext.ArticleData.Add(article);
            await _dbContext.SaveChangesAsync();
        }

        return Ok(new { message = $"Saved article data for {title}", article_title = title });
    }


    [HttpGet("all-article-data")]
    public async Task<IActionResult> GetAllArticleData()
    {
        var allArticles = await _dbContext.ArticleData.Select(a => new
        {
            a.Id,
            a.Title,
            a.Description
        }).ToListAsync();

        return Ok(allArticles);
    }

    [HttpGet("article-data")]
    public async Task<IActionResult> GetArticleData([FromQuery] string article_id = "", [FromQuery] string article_title = "")
    {
        var title_modified = article_title.Replace(' ', '_').ToLower();

        ArticleData? articleData;

        if (!string.IsNullOrEmpty(title_modified))
        {
            articleData = await _dbContext.ArticleData.FirstOrDefaultAsync(a => a.Title.ToLower() == title_modified);
            
        } else
        {
            articleData = await _dbContext.ArticleData.FirstOrDefaultAsync(a => a.Id == Int32.Parse(article_id));

        }
        if (articleData == null)
        {
            return NotFound();
        }

        return Ok(articleData);

    }

    [HttpGet("articles")]
    public async Task<IActionResult> GetArticles(
    [FromQuery] string title = "",
    [FromQuery] string categories = "",
    [FromQuery] string description = "")
    {
        var title_modified = title.Replace(' ', '_').ToLower();                                                                                                                                       
        var categories_separated = categories.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                             .Select(c => c.Trim().ToLower())
                                             .ToList();

        var query = _dbContext.ArticleData.AsQueryable();

        if (!string.IsNullOrWhiteSpace(title_modified))
        {
            query = query.Where(a => a.Title.ToLower().Contains(title_modified));
        }

        if (!string.IsNullOrWhiteSpace(description))
        {
            query = query.Where(a => a.Description.ToLower().Contains(description.ToLower()));
        }

        var filtered = await query.ToListAsync();

        if (categories_separated.Any())
        {
            filtered = filtered.Where(a =>
                !string.IsNullOrEmpty(a.Categories) &&
                a.Categories.ToLower()
                            .Split(',', StringSplitOptions.RemoveEmptyEntries)
                            .Select(c => c.Trim())
                            .Any(cat => categories_separated.Contains(cat))
            ).ToList();
        }

        var articles = filtered.Select(a => new
        {
            a.Id,
            a.Title,
            a.Description
        });

        return Ok(articles);
    }


    [HttpGet("edits")]
    public async Task<IActionResult> GetMonthlyEdits([FromQuery] string title, [FromQuery] int initialYear = 2025,
    [FromQuery] int initialMonth = 5, [FromQuery] int offsetMonths = 12, [FromQuery] int offsetDays = 0)
    {
        var articleData = await _dbContext.ArticleData.FirstOrDefaultAsync(a => a.Title == title);

        if (articleData == null)
        {
            return NotFound(new { message = $"No article found with the title '{title}'." });
        }

        DateTime endDate = new DateTime(initialYear, initialMonth, 1);
        DateTime startDate = endDate.AddMonths(-offsetMonths).AddDays(-offsetDays);


        var response = await _elasticClient.SearchAsync<ArticleEdit>(s => s
            .Index("articles-edits")
            .Query(q => q
                .Bool(b => b
                    .Must(
                        m => m.Match(ma => ma.Field(f => f.ArticleTitle).Query(title)),
                        m => m.DateRange(dr => dr
                            .Field(f => f.EditTimestamp)
                            .GreaterThanOrEquals(startDate)
                            .LessThan(endDate)
                        )
                    )
                )
            )
            .Size(10000)
        );

        if (!response.IsValid) return BadRequest(response.OriginalException?.Message);

        var monthlyCounts = response.Documents
            .GroupBy(doc => new { doc.EditTimestamp.Year, doc.EditTimestamp.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                month = $"{g.Key.Year} - {g.Key.Month:D2}",
                count = g.Count()
            });

        return Ok(monthlyCounts);
    }

    [HttpGet("views")]
    public async Task<IActionResult> GetMonthlyViews([FromQuery] string title, [FromQuery] int initialYear = 2025,
    [FromQuery] int initialMonth = 5, [FromQuery] int offsetMonths = 12, [FromQuery] int offsetDays = 0)
    {
        var articleData = await _dbContext.ArticleData.FirstOrDefaultAsync(a => a.Title == title);

        if (articleData == null)
        {
            return NotFound(new { message = $"No article found with the title '{title}'." });
        }

        DateTime endDate = new DateTime(initialYear, initialMonth, 1);
        DateTime startDate = endDate.AddMonths(-offsetMonths).AddDays(-offsetDays);


        var response = await _elasticClient.SearchAsync<ArticleView>(s => s
            .Index("articles-views")
            .Query(q => q
                .Bool(b => b
                    .Must(
                        m => m.Match(ma => ma.Field(f => f.ArticleTitle).Query(title)),
                        m => m.DateRange(dr => dr
                            .Field(f => f.PageviewDate)
                            .GreaterThanOrEquals(startDate)
                            .LessThan(endDate)
                        )
                    )
                )
            )
            .Size(10000)
        );

        if (!response.IsValid) return BadRequest(response.OriginalException?.Message);

        var monthlyCounts = response.Documents
            .GroupBy(doc => new { doc.PageviewDate.Year, doc.PageviewDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                month = $"{g.Key.Year}-{g.Key.Month:D2}",
                count = g.Sum(v => v.Views)
            });

        return Ok(monthlyCounts);
    }








    [HttpPost("populate")]
    public async Task<IActionResult> PopulateData([FromQuery] string action, [FromQuery(Name = "subaction")] string subAction, [FromQuery] int offset = 0)
    {
        // Spored query parametrite birame tituli za da go popolnime ES
        List<string> titles = action.ToLower() switch
        {
            "country" => await _wikiService.GetArticlesByCountry(subAction ?? "us", offset),
            "category" => await _wikiService.GetArticlesByCategory(subAction ?? "Artificial intelligence"),
            _ => new List<string>()
        };

        // Za sekoja titula kje go povikame FetchEdits ednash(bidejki gi dobivame site) i FetchViews podatocite za sega, pred 4, 8 i 12 meseci i FetchCategories
        // kako za inicijalno propagiranje na podatoci
        foreach (var title in titles)
        {
            await FetchEdits(title);

            await FetchViews(title);
        }

        return Ok("Data population complete.");
    }


}
