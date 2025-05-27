using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Net.Http.Headers;

public class WikipediaService
{
    private readonly HttpClient _client;
    private readonly string _apiKey;

    public WikipediaService(string apiKey)
    {
        _apiKey = apiKey;
        _client = new HttpClient();
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
    }

    public async Task<JObject> GetDataAsync(string url)
    {
        var response = await _client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }
        var content = await response.Content.ReadAsStringAsync();
        return JObject.Parse(content);
    }

    public async Task<List<string>> GetArticlesByCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category))
            return new List<string>();

        string formattedCategory = category.Trim().Replace(' ', '_');

        string url = $"https://en.wikipedia.org/w/api.php?action=query&list=categorymembers" +
                     $"&cmtitle=Category:{formattedCategory}&cmlimit=100&format=json";

        var response = await _client.GetAsync(url);
        if (!response.IsSuccessStatusCode)
            return new List<string>();

        var json = await response.Content.ReadAsStringAsync();
        var data = JsonConvert.DeserializeObject<dynamic>(json);

        var titles = new List<string>();
        foreach (var item in data?.query?.categorymembers)
        {
            titles.Add((string)item.title);
        }

        return titles;
    }


    public async Task<List<string>> GetArticlesByCountry(string? country, int monthsBefore)
    {
        string project = "en.wikipedia";
        string access = "all-access";
        string today = DateTime.UtcNow.AddMonths(-monthsBefore).AddDays(-1).ToString("yyyy/MM/dd");

        if (!string.IsNullOrEmpty(country))
        {
            project = country.ToLower() switch
            {
                // Mozhe da se dodade moznost za prebaruvanje od povekje drzavi, ama ne e prakticno za ovoj proekt
                "macedonia" => "mk.wikipedia",
                _ => "en.wikipedia"
            };
        }

        string url = $"https://wikimedia.org/api/rest_v1/metrics/pageviews/top/{project}/{access}/{today}";


        var response = await _client.GetAsync(url);
        if (!response.IsSuccessStatusCode) return new List<string>();

        var json = await response.Content.ReadAsStringAsync();
        var data = JsonConvert.DeserializeObject<dynamic>(json);

        var articles = data?.items?[0]?.articles;
        if (articles == null) return new List<string>();
        var titles = new List<string>();

        foreach (var article in articles)
        {
            string title = (string)article.article;
            titles.Add(title);
        }

        return titles.Take(100).ToList();
    }

    private async Task<string[]> GetCategoriesAsync(string title)
    {
        var url = $"https://en.wikipedia.org/w/api.php?action=query&titles={title}&prop=categories&format=json&cllimit=max";
        var data = await GetDataAsync(url);

        var pages = data["query"]?["pages"];
        if (pages == null) return new[] { "Unknown" };

        foreach (var page in pages.Children())
        {
            var categories = page.First["categories"];
            if (categories == null) continue;

            return categories
                .Select(category => category["title"]?.ToString()?.Replace("Category:", "") ?? "Unknown")
                .ToArray();
        }

        return new[] { "Unknown" };
    }

    public async Task<Tuple<DateTime, DateTime, bool>> SearchArticleSavedDates(DateTime dateFrom, DateTime dateTo, string datesToSearch)
    {
        var savedRanges = datesToSearch
            .Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(range =>
            {
                var dates = range.Trim().Split(" - ", StringSplitOptions.RemoveEmptyEntries);
                return Tuple.Create(DateTime.Parse(dates[0]), DateTime.Parse(dates[1]));
            })
            .OrderBy(r => r.Item1) // Sort by start date
            .ToList();

        DateTime currentStart = dateFrom;
        DateTime currentEnd = dateTo;

        foreach (var range in savedRanges)
        {
            var savedStart = range.Item1;
            var savedEnd = range.Item2;

            // If there's no overlap, continue
            if (savedEnd <= currentStart || savedStart >= currentEnd)
            {
                continue;
            }

            // Full overlap
            if (savedStart <= currentStart && savedEnd >= currentEnd)
            {
                return Tuple.Create(currentStart, currentEnd, false); 
            }

            // Partial overlap on the left side
            if (savedStart <= currentStart && savedEnd > currentStart && savedEnd < currentEnd)
            {
                currentStart = savedEnd;
            }

            // Partial overlap on the right side 
            else if (savedStart > currentStart && savedStart < currentEnd && savedEnd >= currentEnd)
            {
                currentEnd = savedStart;
            }

            // Overlap in the middle (split range)
            else if (savedStart > currentStart && savedEnd < currentEnd)
            {
                currentEnd = savedStart;
            }
        }

        // If after trimming we still have something to search
        if (currentStart < currentEnd)
        {
            return Tuple.Create(currentStart, currentEnd, true);
        }

        // Completely overlapped (shouldn't normally hit here with current logic, but safe fallback)
        return Tuple.Create(dateFrom, dateTo, false);
    }



}