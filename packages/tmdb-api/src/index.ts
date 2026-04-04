export type TmdbMovie = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  genre_ids: number[];
  vote_average: number;
};

export type TmdbTvShow = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  first_air_date: string;
  genre_ids: number[];
  vote_average: number;
};

export type TmdbSearchResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

export type TmdbMovieDetails = TmdbMovie & {
  imdb_id: string | null;
  genres: { id: number; name: string }[];
  runtime: number | null;
};

export type TmdbTvShowDetails = TmdbTvShow & {
  external_ids?: { imdb_id: string | null };
  genres: { id: number; name: string }[];
  number_of_seasons: number;
};

export class TmdbAPI {
  private apiKey: string;
  private baseUrl = 'https://api.themoviedb.org/3';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('api_key', this.apiKey);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    return response.json();
  }

  async searchMovies(query: string, page = 1): Promise<TmdbSearchResponse<TmdbMovie>> {
    return this.request('/search/movie', { query, page: String(page) });
  }

  async searchTvShows(query: string, page = 1): Promise<TmdbSearchResponse<TmdbTvShow>> {
    return this.request('/search/tv', { query, page: String(page) });
  }

  async getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
    return this.request(`/movie/${tmdbId}`, { append_to_response: 'external_ids' });
  }

  async getTvShowDetails(tmdbId: number): Promise<TmdbTvShowDetails> {
    return this.request(`/tv/${tmdbId}`, { append_to_response: 'external_ids' });
  }

  static posterUrl(posterPath: string | null, size = 'w200'): string | null {
    if (!posterPath) return null;
    return `https://image.tmdb.org/t/p/${size}${posterPath}`;
  }
}
