using Newtonsoft.Json;

namespace WikipediaArticlePropagationES.Model
{
    public class ArticleView
    {
        [JsonProperty("article_title")]
        public string ArticleTitle { get; set; }

        [JsonProperty("pageview_date")]
        public DateTime PageviewDate { get; set; }

        [JsonProperty("views")]
        public int Views { get; set; }
    }

}
