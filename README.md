# Wikipedia Trends Explorer

Wikipedia Trends Explorer is a full-stack web application built with ASP.NET Core for the backend and Angular for the frontend. It enables users to explore, analyze, and visualize Wikipedia article trends over time. The app integrates with Elasticsearch to store and query both article edits and pageviews.

---

## Features

- **Article Management:**  
  - Add new Wikipedia articles to the database by searching with their title.  
  - View a paginated list of all stored articles displaying their title and description.  
  - Access detailed pages for individual articles with full metadata and statistics.

- **Search & Filtering:**  
  - Filter articles based on title, description, and categories.

- **Trends & Analytics:**  
  - Analyze article popularity (views) and edit activity over custom time periods.  
  - Select parameters such as article title, initial year/month, offset year/days, and metric (popularity or edit count).  
  - View trends using interactive Chart.js visualizations.

- **Comparison:**  
  - Compare trend data of up to 5 articles simultaneously with Chart.js charts.

---

## Data Models & Elasticsearch

The app stores data in two Elasticsearch indices with the following structures:

### 1. Articles Edit Data (`articles-edit` index)

| Field             | Type    | Description                     |
|-------------------|---------|--------------------------------|
| `article_title`   | keyword | Title of the Wikipedia article  |
| `edit_timestamp`  | date    | Timestamp of the edit           |
| `editor_username` | keyword | Username of the editor          |
| `edit_comment`    | text    | Edit summary/comment            |

### 2. Articles Pageview Data (`articles-views` index)

| Field           | Type    | Description                     |
|-----------------|---------|--------------------------------|
| `article_title` | keyword | Title of the Wikipedia article |
| `pageview_date` | date    | Date of pageview count          |
| `views`         | integer | Number of views on that date    |

---

## Article Metadata (Stored in app database)

Each article has metadata stored locally in the app database:

| Field               | Type   | Description                                                  |
|---------------------|--------|--------------------------------------------------------------|
| `Id`                | int    | Primary key                                                  |
| `Title`             | string | Article title                                               |
| `Description`       | string | Short article description                                   |
| `Categories`        | string | Categories the article belongs to                           |
| `DatesSearchedViews`| string | Date ranges for which pageview data has been gathered       |
| `DatesSearchedEdits`| string | Date ranges for which edit data has been gathered           |

---

## Elasticsearch Indices Setup

You **must create the two indices in Elasticsearch before running the app**. Below are example mappings to create them.

### Create `articles-edit` Index

    PUT /articles-edit
    {
      "mappings": {
        "properties": {
          "article_title": {
            "type": "keyword"
          },
          "edit_timestamp": {
            "type": "date"
          },
          "editor_username": {
            "type": "keyword"
          },
          "edit_comment": {
            "type": "text"
          }
        }
      }
    }

### Create `articles-pageviews` Index

    PUT /articles-pageviews
    {
      "mappings": {
        "properties": {
          "article_title": {
            "type": "keyword"
          },
          "pageview_date": {
            "type": "date"
          },
          "views": {
            "type": "integer"
          }
        }
      }
    }

---

## Running the Application Locally

**Requirements:**

- .NET 6.0 or later

- Node.js & Angular CLI

- Elasticsearch (running locally)

1. Clone the repository:
```git clone https://github.com/NeptuneIX/Wikipedia-Trends.git
cd Wikipedia-Trends
```
1. **Set up Elasticsearch** and create the two indices above.  
2. Add your Wikipedia API key to the backend `appsettings.json` file:

    ```json
    {
      "WikipediaApiKey": "YOUR_API_KEY_HERE",
      ...
    }
    ```

3. Start the ASP.NET backend server.  
5. Access the frontend in your browser to add articles, explore data, and analyze trends.

---

## Notes

- The app includes error handling and pagination to ensure smooth user experience.  
- All data interactions with ElasticSearch rely on the indices having the correct mappings.  
- The app is intended to run **locally only** and not deployed publicly.  
- The trends and comparison pages visualize data dynamically using Chart.js.

Developed as part of a university-level ElasticSearch project.

