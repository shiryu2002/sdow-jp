# Six Degrees of Wikipedia

[![Six Degrees of Wikipedia Logo](/website/src/images/logo@2x.png)](https://www.sixdegreesofwikipedia.com/)

[Six Degrees of Wikipedia](https://www.sixdegreesofwikipedia.com) traverses Wikipedia page links to
find the shortest path between any two of the millions of pages on the world's largest free online
encyclopedia.

## Documentation

- [Data Source](./docs/data-source.md) - Where data for the project comes from, including how to
  download or generate the Six Degrees of Wikipedia database yourself.
- [Web Server Setup](./docs/web-server-setup.md) - How to set up a web server to run a production
  version of the Six Degrees of Wikipedia website.
- [Local Setup](.github/CONTRIBUTING.md) - How to set up your local machine to run your own version
  of Six Degrees of Wikipedia.
- [Miscellaneous](./docs/miscellaneous.md) - A collection of interesting searches and edge case
  page titles.

## API

### Route Search API

ウェブサイトとは別に、記事間のルート検索をAPIとして利用できます。

**Endpoint:** `POST /api`

**Request Body (JSON):**

| パラメータ | 型 | 説明 |
|------------|------|------|
| `source` | string | 検索開始記事のタイトル |
| `target` | string | 検索終了記事のタイトル |

**Response (JSON):**

| フィールド | 型 | 説明 |
|------------|------|------|
| `source` | string | 開始記事のタイトル（リダイレクト解決済み） |
| `target` | string | 終了記事のタイトル（リダイレクト解決済み） |
| `route` | array | 開始から終了までの記事タイトルのリスト |

**Example Request:**

```bash
curl -X POST http://localhost:5000/api \
  -H "Content-Type: application/json" \
  -d '{"source": "日本", "target": "アメリカ合衆国"}'
```

**Example Response:**

```json
{
  "source": "日本",
  "target": "アメリカ合衆国",
  "route": ["日本", "太平洋", "アメリカ合衆国"]
}
```

**Error Response:**

ページが存在しない場合:

```json
{
  "error": "開始ページ「存在しない記事」は存在しません。別の検索をお試しください。"
}
```

## Blog

- [Insights On Hitler And More From The First 500,000
  Searches](https://www.sixdegreesofwikipedia.com/blog/search-results-analysis) - Delightful,
  curious, and amusing insights from the first 500,000 searches on Six Degrees of Wikipedia.

## Inspiration

- [Six Degrees of Wikipedia](http://mu.netsoc.ie/wiki/) by Stephen Dolan.
- The general concept of
  [six degrees of separation](https://en.wikipedia.org/wiki/Six_degrees_of_separation) as well as
  its offshoots like
  [Six Degrees of Kevin Bacon](https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon).
- [Wikiracing](https://en.wikipedia.org/wiki/Wikiracing) and its implementations in apps and website
  such as
  [The Wiki Game](https://itunes.apple.com/us/app/the-wiki-game-a-wikipedia-game-of-racing-and-exploring/id459318432?mt=8)
  by Alex Clemesha and [WikiRace](http://2pages.net/wikirace.php) by 2pages.

## Resources

- [Wikipedia API](https://www.mediawiki.org/wiki/API:Main_page)
- [Wikipedia database layout](https://www.mediawiki.org/wiki/Manual:Database_layout)
- [English Wikipedia database dumps](https://dumps.wikimedia.org/enwiki)

## Contributing

Contributions to the project are welcome! See the [contribution page](./.github/CONTRIBUTING.md) for
details on how to get everything set up in your local environment.
