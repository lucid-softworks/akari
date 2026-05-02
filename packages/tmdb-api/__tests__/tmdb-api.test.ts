import { TmdbAPI, type TmdbMovie, type TmdbMovieDetails, type TmdbSearchResponse, type TmdbTvShow, type TmdbTvShowDetails } from '../src';

describe('TmdbAPI', () => {
  const fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();

  beforeAll(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  const jsonResponse = <T>(body: T, init: ResponseInit = { status: 200 }) =>
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });

  const lastRequestUrl = () => {
    const calls = fetchMock.mock.calls;
    const [url] = calls[calls.length - 1] ?? [];
    return new URL(typeof url === 'string' ? url : url instanceof URL ? url.toString() : (url as Request).url);
  };

  describe('searchMovies', () => {
    it('builds the request URL and returns the parsed payload', async () => {
      const payload: TmdbSearchResponse<TmdbMovie> = {
        page: 2,
        results: [],
        total_pages: 5,
        total_results: 0,
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(payload));

      const api = new TmdbAPI('test-key');
      const result = await api.searchMovies('inception', 2);

      expect(result).toEqual(payload);
      const url = lastRequestUrl();
      expect(url.origin + url.pathname).toBe('https://api.themoviedb.org/3/search/movie');
      expect(url.searchParams.get('api_key')).toBe('test-key');
      expect(url.searchParams.get('query')).toBe('inception');
      expect(url.searchParams.get('page')).toBe('2');
    });

    it('defaults the page to 1 when omitted', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse<TmdbSearchResponse<TmdbMovie>>({ page: 1, results: [], total_pages: 0, total_results: 0 }),
      );

      const api = new TmdbAPI('key');
      await api.searchMovies('mulholland');

      expect(lastRequestUrl().searchParams.get('page')).toBe('1');
    });

    it('throws when the response is not ok', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 401 }));
      const api = new TmdbAPI('bad-key');

      await expect(api.searchMovies('anything')).rejects.toThrow('TMDB API error: 401');
    });
  });

  describe('searchTvShows', () => {
    it('hits the TV search endpoint', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse<TmdbSearchResponse<TmdbTvShow>>({ page: 1, results: [], total_pages: 0, total_results: 0 }),
      );

      const api = new TmdbAPI('key');
      await api.searchTvShows('breaking bad');

      const url = lastRequestUrl();
      expect(url.pathname).toBe('/3/search/tv');
      expect(url.searchParams.get('query')).toBe('breaking bad');
    });
  });

  describe('getMovieDetails', () => {
    it('requests external_ids and returns the response', async () => {
      const details: TmdbMovieDetails = {
        id: 27205,
        title: 'Inception',
        overview: '',
        poster_path: '/poster.jpg',
        release_date: '2010-07-16',
        genre_ids: [],
        vote_average: 8.4,
        imdb_id: 'tt1375666',
        genres: [{ id: 28, name: 'Action' }],
        runtime: 148,
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(details));

      const api = new TmdbAPI('key');
      const result = await api.getMovieDetails(27205);

      expect(result).toEqual(details);
      const url = lastRequestUrl();
      expect(url.pathname).toBe('/3/movie/27205');
      expect(url.searchParams.get('append_to_response')).toBe('external_ids');
    });
  });

  describe('getTvShowDetails', () => {
    it('hits the TV details endpoint with external_ids', async () => {
      const details: TmdbTvShowDetails = {
        id: 1396,
        name: 'Breaking Bad',
        overview: '',
        poster_path: null,
        first_air_date: '2008-01-20',
        genre_ids: [],
        vote_average: 8.9,
        external_ids: { imdb_id: 'tt0903747' },
        genres: [],
        number_of_seasons: 5,
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(details));

      const api = new TmdbAPI('key');
      const result = await api.getTvShowDetails(1396);

      expect(result).toEqual(details);
      const url = lastRequestUrl();
      expect(url.pathname).toBe('/3/tv/1396');
      expect(url.searchParams.get('append_to_response')).toBe('external_ids');
    });

    it('throws on non-ok responses', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, { status: 404 }));
      const api = new TmdbAPI('key');

      await expect(api.getTvShowDetails(1)).rejects.toThrow('TMDB API error: 404');
    });
  });

  describe('posterUrl', () => {
    it('returns null when the poster path is null', () => {
      expect(TmdbAPI.posterUrl(null)).toBeNull();
    });

    it('builds the image URL with the default size', () => {
      expect(TmdbAPI.posterUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w200/abc.jpg');
    });

    it('honours the size override', () => {
      expect(TmdbAPI.posterUrl('/abc.jpg', 'w500')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
    });
  });
});
