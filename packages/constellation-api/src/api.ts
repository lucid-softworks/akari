import { ConstellationApiClient } from './client';
import type {
  ConstellationAllLinksQuery,
  ConstellationAllLinksResponse,
  ConstellationCountQuery,
  ConstellationCountResponse,
  ConstellationDistinctDidCountResponse,
  ConstellationDistinctDidsResponse,
  ConstellationLinksQuery,
  ConstellationLinksResponse,
  ConstellationServerInfo,
} from './types';

export class ConstellationApi extends ConstellationApiClient {
  async getServerInfo(): Promise<ConstellationServerInfo> {
    return this.get<ConstellationServerInfo>('/');
  }

  async getLinks(query: ConstellationLinksQuery): Promise<ConstellationLinksResponse> {
    return this.get<ConstellationLinksResponse>('/links', query);
  }

  async getDistinctDids(query: ConstellationLinksQuery): Promise<ConstellationDistinctDidsResponse> {
    return this.get<ConstellationDistinctDidsResponse>('/links/distinct-dids', query);
  }

  async getLinkCount(query: ConstellationCountQuery): Promise<ConstellationCountResponse> {
    return this.get<ConstellationCountResponse>('/links/count', query);
  }

  async getDistinctDidCount(query: ConstellationCountQuery): Promise<ConstellationDistinctDidCountResponse> {
    return this.get<ConstellationDistinctDidCountResponse>('/links/count/distinct-dids', query);
  }

  async getAllLinks(query: ConstellationAllLinksQuery): Promise<ConstellationAllLinksResponse> {
    return this.get<ConstellationAllLinksResponse>('/links/all', query);
  }
}
