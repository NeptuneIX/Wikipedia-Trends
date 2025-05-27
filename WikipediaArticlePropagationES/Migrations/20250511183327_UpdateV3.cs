using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WikipediaArticlePropagationES.Migrations
{
    /// <inheritdoc />
    public partial class UpdateV3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "DatesSearched",
                table: "ArticleData",
                newName: "DatesSearchedViews");

            migrationBuilder.AddColumn<string>(
                name: "DatesSearchedEdits",
                table: "ArticleData",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DatesSearchedEdits",
                table: "ArticleData");

            migrationBuilder.RenameColumn(
                name: "DatesSearchedViews",
                table: "ArticleData",
                newName: "DatesSearched");
        }
    }
}
