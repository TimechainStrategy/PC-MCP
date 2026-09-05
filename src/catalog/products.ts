import catalogJson from "./endpoints-catalog.json" with { type: "json" };

export interface CatalogEndpoint {
  method: string;
  path: string;
  summary: string;
}

export interface CatalogProduct {
  apiPath: string;
  version: string;
  scope: string | null;
  docs: string;
  title: string;
  endpointCount: number;
  endpoints: CatalogEndpoint[];
}

export interface EndpointsCatalog {
  baseUrl: string;
  products: Record<string, CatalogProduct>;
}

export const endpointsCatalog = catalogJson as EndpointsCatalog;

export const PRODUCT_IDS = Object.keys(endpointsCatalog.products) as string[];

export function getProduct(productId: string): CatalogProduct | undefined {
  return endpointsCatalog.products[productId];
}

export function listProductsSummary() {
  return PRODUCT_IDS.map((id) => {
    const p = endpointsCatalog.products[id];
    return {
      id,
      title: p.title,
      apiPath: p.apiPath,
      version: p.version,
      oauthScope: p.scope,
      docs: p.docs,
      endpointCount: p.endpointCount,
      openApi: `${endpointsCatalog.baseUrl}/${p.apiPath}/v2/open_api/${p.version}`,
      rootUrl: `${endpointsCatalog.baseUrl}/${p.apiPath}/v2`,
    };
  });
}

export function filterEndpoints(
  productId: string,
  options: {
    method?: string;
    search?: string;
    collectionOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {},
): { product: CatalogProduct; total: number; endpoints: CatalogEndpoint[] } | null {
  const product = getProduct(productId);
  if (!product) return null;

  const method = options.method?.toUpperCase();
  const search = options.search?.toLowerCase();

  let endpoints = product.endpoints.filter((ep) => {
    if (method && ep.method !== method) return false;
    if (options.collectionOnly && ep.path.includes("{")) return false;
    if (search) {
      const hay = `${ep.method} ${ep.path} ${ep.summary}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  const total = endpoints.length;
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 100;
  endpoints = endpoints.slice(offset, offset + limit);

  return { product, total, endpoints };
}
