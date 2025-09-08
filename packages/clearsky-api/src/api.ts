import { ClearSkyApiClient } from './client';
import type {
  ClearSky24HourBlockStatsResponse,
  ClearSkyBlockStatsResponse,
  ClearSkyBlocklistResponse,
  ClearSkyBlocklistTotalResponse,
  ClearSkyDidResponse,
  ClearSkyDidsPerPdsResponse,
  ClearSkyGetHandleHistoryResponse,
  ClearSkyGetLabelersResponse,
  ClearSkyGetListResponse,
  ClearSkyGetListTotalResponse,
  ClearSkyGetProfileResponse,
  ClearSkyHandleResponse,
  ClearSkyPaginationOptions,
  ClearSkyPlacementResponse,
  ClearSkySearchModerationListsResponse,
  ClearSkySingleBlocklistResponse,
  ClearSkySingleBlocklistTotalResponse,
  ClearSkySingleStarterPackResponse,
  ClearSkySingleStarterPackTotalResponse,
  ClearSkyStarterPacksResponse,
  ClearSkyStarterPacksTotalResponse,
  ClearSkySubscribeBlocksBlocklistResponse,
  ClearSkySubscribeBlocksSingleBlocklistResponse,
  ClearSkySubscribeBlocksSingleBlocklistUsersResponse,
  ClearSkyTimeBehindResponse,
  ClearSkyTopBlockStatsResponse,
  ClearSkyTotalUsersResponse,
  ClearSkyUriUrlResponse,
  ClearSkyValidateHandleResponse,
} from './types';

/**
 * ClearSky API endpoints
 */
export class ClearSkyApi extends ClearSkyApiClient {
  /**
   * Get the DID of a given handle
   * @param handle - The handle to look up
   * @returns Promise resolving to the DID information
   */
  async getDid(handle: string): Promise<ClearSkyDidResponse> {
    return this.get<ClearSkyDidResponse>(`/api/v1/anon/get-did/${encodeURIComponent(handle)}`);
  }

  /**
   * Get the handle of a given DID
   * @param did - The DID to look up
   * @returns Promise resolving to the handle information
   */
  async getHandle(did: string): Promise<ClearSkyHandleResponse> {
    return this.get<ClearSkyHandleResponse>(`/api/v1/anon/get-handle/${encodeURIComponent(did)}`);
  }

  /**
   * Get user count information: total users, active users, deleted users
   * @returns Promise resolving to the user count information
   */
  async getTotalUsers(): Promise<ClearSkyTotalUsersResponse> {
    return this.get<ClearSkyTotalUsersResponse>('/api/v1/anon/total-users');
  }

  /**
   * Validate a handle
   * @param handle - The handle to validate
   * @returns Promise resolving to the validation result
   */
  async validateHandle(handle: string): Promise<ClearSkyValidateHandleResponse> {
    return this.get<ClearSkyValidateHandleResponse>(`/api/v1/anon/validation/validate-handle/${encodeURIComponent(handle)}`);
  }

  /**
   * Get the URL of a given URI
   * @param uri - The URI to resolve
   * @returns Promise resolving to the URL information
   */
  async getUriUrl(uri: string): Promise<ClearSkyUriUrlResponse> {
    return this.get<ClearSkyUriUrlResponse>(`/api/v1/anon/uri-url/${encodeURIComponent(uri)}`);
  }

  /**
   * Get top 20 blockers and blocked
   * @returns Promise resolving to the block statistics
   */
  async getTopBlockStats(): Promise<ClearSkyTopBlockStatsResponse> {
    return this.get<ClearSkyTopBlockStatsResponse>('/api/v1/anon/lists/fun-facts');
  }

  /**
   * Get top 20 blockers and blocked in the last 24 hours
   * @returns Promise resolving to the 24-hour block statistics
   */
  async getTopBlockStats24Hour(): Promise<ClearSky24HourBlockStatsResponse> {
    return this.get<ClearSky24HourBlockStatsResponse>('/api/v1/anon/lists/funer-facts');
  }

  /**
   * Get a list of block stats based on userbase
   * @returns Promise resolving to the block statistics
   */
  async getBlockStats(): Promise<ClearSkyBlockStatsResponse> {
    return this.get<ClearSkyBlockStatsResponse>('/api/v1/anon/lists/block-stats');
  }

  /**
   * Get list of moderation lists a user is on
   * @param identifier - The handle or DID to look up
   * @param options - Pagination options
   * @returns Promise resolving to the moderation lists
   */
  async getList(identifier: string, options: ClearSkyPaginationOptions = {}): Promise<ClearSkyGetListResponse> {
    const { page } = options;
    const endpoint = page
      ? `/api/v1/anon/get-list/${encodeURIComponent(identifier)}/${page}`
      : `/api/v1/anon/get-list/${encodeURIComponent(identifier)}`;
    return this.get<ClearSkyGetListResponse>(endpoint);
  }

  /**
   * Get the total number of moderation lists a user is on
   * @param identifier - The handle or DID to look up
   * @returns Promise resolving to the total count
   */
  async getListTotal(identifier: string): Promise<ClearSkyGetListTotalResponse> {
    return this.get<ClearSkyGetListTotalResponse>(`/api/v1/anon/get-list/total/${encodeURIComponent(identifier)}`);
  }

  /**
   * Get list of lists that a user is blocking
   * @param identifier - The handle or DID to look up
   * @param options - Pagination options
   * @returns Promise resolving to the blocklist
   */
  async getBlocklist(identifier: string, options: ClearSkyPaginationOptions = {}): Promise<ClearSkyBlocklistResponse> {
    const { page } = options;
    const endpoint = page
      ? `/api/v1/anon/blocklist/${encodeURIComponent(identifier)}/${page}`
      : `/api/v1/anon/blocklist/${encodeURIComponent(identifier)}`;
    return this.get<ClearSkyBlocklistResponse>(endpoint);
  }

  /**
   * Get list of lists that a user is blocked on
   * @param identifier - The handle or DID to look up
   * @param options - Pagination options
   * @returns Promise resolving to the single blocklist
   */
  async getSingleBlocklist(
    identifier: string,
    options: ClearSkyPaginationOptions = {},
  ): Promise<ClearSkySingleBlocklistResponse> {
    const { page } = options;
    const endpoint = page
      ? `/api/v1/anon/single-blocklist/${encodeURIComponent(identifier)}/${page}`
      : `/api/v1/anon/single-blocklist/${encodeURIComponent(identifier)}`;
    return this.get<ClearSkySingleBlocklistResponse>(endpoint);
  }

  /**
   * Get the total number of lists a user is blocking
   * @param identifier - The handle or DID to look up
   * @returns Promise resolving to the total count
   */
  async getBlocklistTotal(identifier: string): Promise<ClearSkyBlocklistTotalResponse> {
    return this.get<ClearSkyBlocklistTotalResponse>(`/api/v1/anon/blocklist/total/${encodeURIComponent(identifier)}`);
  }

  /**
   * Get the total number of lists a user is blocked on
   * @param identifier - The handle or DID to look up
   * @returns Promise resolving to the total count
   */
  async getSingleBlocklistTotal(identifier: string): Promise<ClearSkySingleBlocklistTotalResponse> {
    return this.get<ClearSkySingleBlocklistTotalResponse>(
      `/api/v1/anon/single-blocklist/total/${encodeURIComponent(identifier)}`,
    );
  }

  /**
   * Get Profile information of a user
   * @param identifier - The handle or DID to look up
   * @returns Promise resolving to the profile information
   */
  async getProfile(identifier: string): Promise<ClearSkyGetProfileResponse> {
    return this.get<ClearSkyGetProfileResponse>(`/api/v1/anon/get-profile/${encodeURIComponent(identifier)}`);
  }

  /**
   * Get a list of lists that a user is blocking
   * @param identifier - The handle or DID to look up
   * @param options - Pagination options
   * @returns Promise resolving to the subscribe blocks blocklist
   */
  async getSubscribeBlocksBlocklist(
    identifier: string,
    options: ClearSkyPaginationOptions = {},
  ): Promise<ClearSkySubscribeBlocksBlocklistResponse> {
    const { page } = options;
    const endpoint = page
      ? `/api/v1/anon/subscribe-blocks-blocklist/${encodeURIComponent(identifier)}/${page}`
      : `/api/v1/anon/subscribe-blocks-blocklist/${encodeURIComponent(identifier)}`;
    return this.get<ClearSkySubscribeBlocksBlocklistResponse>(endpoint);
  }

  /**
   * Get list of lists that a user is blocked on
   * @param identifier - The handle or DID to look up
   * @param options - Pagination options
   * @returns Promise resolving to the subscribe blocks single blocklist
   */
  async getSubscribeBlocksSingleBlocklist(
    identifier: string,
    options: ClearSkyPaginationOptions = {},
  ): Promise<ClearSkySubscribeBlocksSingleBlocklistResponse> {
    const { page } = options;
    const endpoint = page
      ? `/api/v1/anon/subscribe-blocks-single-blocklist/${encodeURIComponent(identifier)}/${page}`
      : `/api/v1/anon/subscribe-blocks-single-blocklist/${encodeURIComponent(identifier)}`;
    return this.get<ClearSkySubscribeBlocksSingleBlocklistResponse>(endpoint);
  }

  /**
   * Get the list of users that a user is blocked by based on list subscriptions
   * @param url - The URL to look up
   * @param options - Pagination options
   * @returns Promise resolving to the user blocklist
   */
  async getSubscribeBlocksSingleBlocklistUsers(
    url: string,
    options: ClearSkyPaginationOptions = {},
  ): Promise<ClearSkySubscribeBlocksSingleBlocklistUsersResponse> {
    const { page } = options;
    const endpoint = page
      ? `/api/v1/anon/subscribe-blocks-single-blocklist/users/${encodeURIComponent(url)}/${page}`
      : `/api/v1/anon/subscribe-blocks-single-blocklist/users/${encodeURIComponent(url)}`;
    return this.get<ClearSkySubscribeBlocksSingleBlocklistUsersResponse>(endpoint);
  }

  /**
   * Return a list of the count of users on each PDS
   * @returns Promise resolving to the PDS count data
   */
  async getDidsPerPds(): Promise<ClearSkyDidsPerPdsResponse> {
    return this.get<ClearSkyDidsPerPdsResponse>('/api/v1/anon/lists/dids-per-pds');
  }

  /**
   * Get a list of lists and other details based on word search of either the list name or description
   * @param name - The search term
   * @param options - Pagination options
   * @returns Promise resolving to the search results
   */
  async searchModerationLists(
    name: string,
    options: ClearSkyPaginationOptions = {},
  ): Promise<ClearSkySearchModerationListsResponse> {
    const { page } = options;
    const endpoint = page
      ? `/api/v1/anon/search/moderation-lists/${encodeURIComponent(name)}/${page}`
      : `/api/v1/anon/search/moderation-lists/${encodeURIComponent(name)}`;
    return this.get<ClearSkySearchModerationListsResponse>(endpoint);
  }

  /**
   * Get the account history of a user
   * @param identifier - The handle or DID to look up
   * @returns Promise resolving to the handle history
   */
  async getHandleHistory(identifier: string): Promise<ClearSkyGetHandleHistoryResponse> {
    return this.get<ClearSkyGetHandleHistoryResponse>(`/api/v1/anon/get-handle-history/${encodeURIComponent(identifier)}`);
  }

  /**
   * Get the logo image
   * @returns Promise resolving to the image blob
   */
  async getLogo(): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/v1/anon/images/logo`);
    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.status}`);
    }
    return response.blob();
  }

  /**
   * Get the time behind status of clearsky data
   * @returns Promise resolving to the time behind information
   */
  async getTimeBehind(): Promise<ClearSkyTimeBehindResponse> {
    return this.get<ClearSkyTimeBehindResponse>('/api/v1/anon/status/time-behind');
  }

  /**
   * Get the active labelers
   * @param options - Pagination options
   * @returns Promise resolving to the labelers list
   */
  async getLabelers(options: ClearSkyPaginationOptions = {}): Promise<ClearSkyGetLabelersResponse> {
    const { page } = options;
    const endpoint = page ? `/api/v1/anon/get-labelers/${page}` : '/api/v1/anon/get-labelers';
    return this.get<ClearSkyGetLabelersResponse>(endpoint);
  }

  /**
   * Get the place that a user joined bluesky
   * @param identifier - The handle or DID to look up
   * @returns Promise resolving to the placement information
   */
  async getPlacement(identifier: string): Promise<ClearSkyPlacementResponse> {
    return this.get<ClearSkyPlacementResponse>(`/api/v1/anon/placement/${encodeURIComponent(identifier)}`);
  }

  /**
   * Get the starter packs a user has made
   * @param identifier - The handle or DID to look up
   * @param options - Pagination options
   * @returns Promise resolving to the starter packs
   */
  async getStarterPacks(identifier: string, options: ClearSkyPaginationOptions = {}): Promise<ClearSkyStarterPacksResponse> {
    const { page } = options;
    const endpoint = page
      ? `/api/v1/anon/starter-packs/${encodeURIComponent(identifier)}/${page}`
      : `/api/v1/anon/starter-packs/${encodeURIComponent(identifier)}`;
    return this.get<ClearSkyStarterPacksResponse>(endpoint);
  }

  /**
   * Get the total number of starter packs a user has made
   * @param identifier - The handle or DID to look up
   * @returns Promise resolving to the total count
   */
  async getStarterPacksTotal(identifier: string): Promise<ClearSkyStarterPacksTotalResponse> {
    return this.get<ClearSkyStarterPacksTotalResponse>(`/api/v1/anon/starter-packs/total/${encodeURIComponent(identifier)}`);
  }

  /**
   * Get the starter packs a user is on
   * @param identifier - The handle or DID to look up
   * @param options - Pagination options
   * @returns Promise resolving to the single starter packs
   */
  async getSingleStarterPack(
    identifier: string,
    options: ClearSkyPaginationOptions = {},
  ): Promise<ClearSkySingleStarterPackResponse> {
    const { page } = options;
    const endpoint = page
      ? `/api/v1/anon/single-starter-pack/${encodeURIComponent(identifier)}/${page}`
      : `/api/v1/anon/single-starter-pack/${encodeURIComponent(identifier)}`;
    return this.get<ClearSkySingleStarterPackResponse>(endpoint);
  }

  /**
   * Get the total number of starter packs a user is on
   * @param identifier - The handle or DID to look up
   * @returns Promise resolving to the total count
   */
  async getSingleStarterPackTotal(identifier: string): Promise<ClearSkySingleStarterPackTotalResponse> {
    return this.get<ClearSkySingleStarterPackTotalResponse>(
      `/api/v1/anon/single-starter-pack/total/${encodeURIComponent(identifier)}`,
    );
  }
}
