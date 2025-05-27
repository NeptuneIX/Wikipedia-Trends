using Newtonsoft.Json;

namespace WikipediaArticlePropagationES.Model
{
    public class ArticleEdit
    {
        [JsonProperty("article_title")]
        public string ArticleTitle { get; set; }

        [JsonProperty("edit_timestamp")]
        public DateTime EditTimestamp { get; set; }

        [JsonProperty("editor_username")]
        public string EditorUsername { get; set; }

        [JsonProperty("edit_comment")]
        public string EditComment { get; set; }
    }


}
