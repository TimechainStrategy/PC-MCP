/**
 * JSON:API 1.0 envelope types used by Planning Center Online.
 * @see https://api.planningcenteronline.com/docs/overview/json-api
 * @see https://jsonapi.org/format/
 */

export type JsonApiId = string;

export interface JsonApiResourceIdentifier {
  type: string;
  id: JsonApiId;
}

export interface JsonApiRelationshipToOne {
  data: JsonApiResourceIdentifier | null;
  links?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export interface JsonApiRelationshipToMany {
  data: JsonApiResourceIdentifier[];
  links?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export type JsonApiRelationship =
  | JsonApiRelationshipToOne
  | JsonApiRelationshipToMany
  | {
      data?: JsonApiResourceIdentifier | JsonApiResourceIdentifier[] | null;
      links?: Record<string, string>;
      meta?: Record<string, unknown>;
    };

export interface JsonApiResource<
  TAttributes extends Record<string, unknown> = Record<string, unknown>,
> {
  type: string;
  id: JsonApiId;
  attributes?: TAttributes;
  relationships?: Record<string, JsonApiRelationship>;
  links?: Record<string, string>;
  meta?: Record<string, unknown>;
}

export interface JsonApiErrorObject {
  id?: string;
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
  meta?: Record<string, unknown>;
}

export interface JsonApiLinks {
  self?: string;
  related?: string;
  first?: string | null;
  prev?: string | null;
  next?: string | null;
  last?: string | null;
  [key: string]: string | null | undefined;
}

export interface JsonApiMeta {
  total_count?: number;
  count?: number;
  can_order_by?: string[];
  can_query_by?: string[];
  can_include?: string[];
  can_filter?: string[];
  parent?: JsonApiResourceIdentifier;
  [key: string]: unknown;
}

export interface JsonApiDocument<
  TData = JsonApiResource | JsonApiResource[] | null,
> {
  data?: TData;
  errors?: JsonApiErrorObject[];
  included?: JsonApiResource[];
  links?: JsonApiLinks;
  meta?: JsonApiMeta;
  jsonapi?: {
    version?: string;
  };
}

export type JsonApiSingleDocument<TAttributes extends Record<string, unknown> = Record<string, unknown>> =
  JsonApiDocument<JsonApiResource<TAttributes>>;

export type JsonApiCollectionDocument<
  TAttributes extends Record<string, unknown> = Record<string, unknown>,
> = JsonApiDocument<Array<JsonApiResource<TAttributes>>>;

/** Rate-limit headers returned by every PCO response. */
export interface PcoRateLimitInfo {
  limit: number | null;
  count: number | null;
  period: string | null;
  retryAfterSeconds: number | null;
}

export interface PcoRequestResult<T = JsonApiDocument> {
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
  method: string;
  rateLimit: PcoRateLimitInfo;
  headers: Record<string, string>;
  body: T | string | null;
  error?: {
    message: string;
    hint?: string;
    errors?: JsonApiErrorObject[];
  };
}
