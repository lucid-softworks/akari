const TENOR_BASE_URL = 'https://tenor.googleapis.com/v2';

export type TenorGif = {
  id: string;
  title: string;
  media_formats: {
    gif?: {
      url: string;
      dims: [number, number];
      size: number;
    };
    tinygif?: {
      url: string;
      dims: [number, number];
      size: number;
    };
    nanogif?: {
      url: string;
      dims: [number, number];
      size: number;
    };
    [key: string]:
      | {
          url: string;
          dims: [number, number];
          size: number;
        }
      | undefined;
  };
  created: number;
  content_description: string;
  itemurl: string;
  url: string;
  tags: string[];
  flags: string[];
  hasaudio: boolean;
};

export type TenorSearchResponse = {
  results: TenorGif[];
  next: string;
};

export type TenorTrendingResponse = {
  results: TenorGif[];
  next: string;
};

export type TenorAttachedImage = {
  uri: string;
  alt: string;
  mimeType: string;
  tenorId?: string;
};

class TenorAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Search for GIFs using Tenor API
   * @param query - Search query
   * @param limit - Number of results to return (max 50)
   * @param pos - Position for pagination
   * @returns Promise with search results
   */
  async searchGifs(query: string, limit: number = 20, pos?: string): Promise<TenorSearchResponse> {
    const params = new URLSearchParams({
      q: query,
      key: this.apiKey,
      limit: limit.toString(),
      media_filter: 'gif',
      contentfilter: 'medium',
    });

    if (pos) {
      params.append('pos', pos);
    }

    const response = await fetch(`${TENOR_BASE_URL}/search?${params}`);

    if (!response.ok) {
      throw new Error(`Tenor API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get trending GIFs from Tenor
   * @param limit - Number of results to return (max 50)
   * @param pos - Position for pagination
   * @returns Promise with trending results
   */
  async getTrendingGifs(limit: number = 20, pos?: string): Promise<TenorTrendingResponse> {
    const params = new URLSearchParams({
      key: this.apiKey,
      limit: limit.toString(),
      media_filter: 'gif',
      contentfilter: 'medium',
    });

    if (pos) {
      params.append('pos', pos);
    }

    const response = await fetch(`${TENOR_BASE_URL}/featured?${params}`);

    if (!response.ok) {
      throw new Error(`Tenor API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get GIF by ID
   * @param id - Tenor GIF ID
   * @returns Promise with GIF data
   */
  async getGifById(id: string): Promise<TenorGif> {
    const params = new URLSearchParams({
      key: this.apiKey,
      ids: id,
      media_filter: 'gif',
    });

    const response = await fetch(`${TENOR_BASE_URL}/posts?${params}`);

    if (!response.ok) {
      throw new Error(`Tenor API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results[0];
  }

  /**
   * Download GIF as blob for upload
   * @param gifUrl - URL of the GIF to download
   * @returns Promise with blob data
   */
  async downloadGifAsBlob(gifUrl: string): Promise<Blob> {
    const response = await fetch(gifUrl);

    if (!response.ok) {
      throw new Error(`Failed to download GIF: ${response.status} ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Converts a Tenor GIF response into the attachment structure used by Bluesky posts.
   * @param gif - Tenor GIF entry returned by the search or trending endpoints.
   * @returns Attachment metadata capturing the GIF URL, alt text and Bluesky MIME requirements.
   */
  convertGifToAttachedImage(gif: TenorGif): TenorAttachedImage {
    // Try to get the best available format
    const gifUrl = gif.media_formats.gif?.url || gif.media_formats.tinygif?.url || gif.media_formats.nanogif?.url || gif.url;

    if (!gifUrl) {
      throw new Error('No valid GIF URL found in media formats');
    }

    // Add size parameters to the URL to match Bluesky's format
    const url = new URL(gifUrl);

    // Get the actual dimensions from the GIF format
    const gifFormat = gif.media_formats.gif || gif.media_formats.tinygif || gif.media_formats.nanogif;
    if (gifFormat && gifFormat.dims) {
      const [width, height] = gifFormat.dims;
      url.searchParams.set('ww', width.toString());
      url.searchParams.set('hh', height.toString());
    }

    return {
      uri: url.toString(),
      alt: gif.content_description || gif.title || 'GIF',
      mimeType: 'image/gif',
      tenorId: gif.id,
    };
  }
}

export { TenorAPI };
