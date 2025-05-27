using Newtonsoft.Json;
using System.ComponentModel.DataAnnotations;

namespace WikipediaArticlePropagationES.Model
{
    public class ArticleData
    {
        [Key]
        public int Id { get; set; } 
        public string Title { get; set; }
        public string Description { get; set; }
        public string Categories { get; set; }
        public string DatesSearchedViews { get; set; }
        public string DatesSearchedEdits { get; set; }
    }

}
