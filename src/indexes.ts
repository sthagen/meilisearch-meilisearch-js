/*
 * Bundle: MeiliSearch / Indexes
 * Project: MeiliSearch - Javascript API
 * Author: Quentin de Quelen <quentin@meilisearch.com>
 * Copyright: 2019, MeiliSearch
 */

import { MeiliSearchError } from "./errors/index.js";
import type {
  Config,
  SearchResponse,
  SearchParams,
  Filter,
  SearchRequestGET,
  IndexObject,
  IndexOptions,
  IndexStats,
  DocumentsQuery,
  DocumentQuery,
  DocumentOptions,
  Settings,
  Synonyms,
  StopWords,
  RankingRules,
  DistinctAttribute,
  FilterableAttributes,
  SortableAttributes,
  SearchableAttributes,
  DisplayedAttributes,
  TypoTolerance,
  WaitOptions,
  TasksQuery,
  TasksResults,
  PaginationSettings,
  Faceting,
  ResourceResults,
  RawDocumentAdditionOptions,
  ContentType,
  DocumentsIds,
  DocumentsDeletionQuery,
  SearchForFacetValuesParams,
  SearchForFacetValuesResponse,
  SeparatorTokens,
  NonSeparatorTokens,
  Dictionary,
  ProximityPrecision,
  Embedders,
  SearchCutoffMs,
  SearchSimilarDocumentsParams,
  LocalizedAttributes,
  UpdateDocumentsByFunctionOptions,
  EnqueuedTaskObject,
  ExtraRequestInit,
  PrefixSearch,
  RecordAny,
} from "./types.js";
import { HttpRequests } from "./http-requests.js";
import { Task, TaskClient } from "./task.js";
import { EnqueuedTask } from "./enqueued-task.js";

class Index<T extends RecordAny = RecordAny> {
  uid: string;
  primaryKey: string | undefined;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
  httpRequest: HttpRequests;
  tasks: TaskClient;

  /**
   * @param config - Request configuration options
   * @param uid - UID of the index
   * @param primaryKey - Primary Key of the index
   */
  constructor(config: Config, uid: string, primaryKey?: string) {
    this.uid = uid;
    this.primaryKey = primaryKey;
    this.httpRequest = new HttpRequests(config);
    this.tasks = new TaskClient(config);
  }

  ///
  /// SEARCH
  ///

  /**
   * Search for documents into an index
   *
   * @param query - Query string
   * @param options - Search options
   * @param config - Additional request configuration options
   * @returns Promise containing the search response
   */
  async search<D extends RecordAny = T, S extends SearchParams = SearchParams>(
    query?: string | null,
    options?: S,
    extraRequestInit?: ExtraRequestInit,
  ): Promise<SearchResponse<D, S>> {
    return await this.httpRequest.post<SearchResponse<D, S>>({
      path: `indexes/${this.uid}/search`,
      body: { q: query, ...options },
      extraRequestInit,
    });
  }

  /**
   * Search for documents into an index using the GET method
   *
   * @param query - Query string
   * @param options - Search options
   * @param config - Additional request configuration options
   * @returns Promise containing the search response
   */
  async searchGet<
    D extends RecordAny = T,
    S extends SearchParams = SearchParams,
  >(
    query?: string | null,
    options?: S,
    extraRequestInit?: ExtraRequestInit,
  ): Promise<SearchResponse<D, S>> {
    // TODO: Make this a type thing instead of a runtime thing
    const parseFilter = (filter?: Filter): string | undefined => {
      if (typeof filter === "string") return filter;
      else if (Array.isArray(filter))
        throw new MeiliSearchError(
          "The filter query parameter should be in string format when using searchGet",
        );
      else return undefined;
    };

    const getParams: SearchRequestGET = {
      q: query,
      ...options,
      filter: parseFilter(options?.filter),
      sort: options?.sort?.join(","),
      facets: options?.facets?.join(","),
      attributesToRetrieve: options?.attributesToRetrieve?.join(","),
      attributesToCrop: options?.attributesToCrop?.join(","),
      attributesToHighlight: options?.attributesToHighlight?.join(","),
      vector: options?.vector?.join(","),
      attributesToSearchOn: options?.attributesToSearchOn?.join(","),
    };

    return await this.httpRequest.get<SearchResponse<D, S>>({
      path: `indexes/${this.uid}/search`,
      params: getParams,
      extraRequestInit,
    });
  }

  /**
   * Search for facet values
   *
   * @param params - Parameters used to search on the facets
   * @param config - Additional request configuration options
   * @returns Promise containing the search response
   */
  async searchForFacetValues(
    params: SearchForFacetValuesParams,
    extraRequestInit?: ExtraRequestInit,
  ): Promise<SearchForFacetValuesResponse> {
    return await this.httpRequest.post<SearchForFacetValuesResponse>({
      path: `indexes/${this.uid}/facet-search`,
      body: params,
      extraRequestInit,
    });
  }

  /**
   * Search for similar documents
   *
   * @param params - Parameters used to search for similar documents
   * @returns Promise containing the search response
   */
  async searchSimilarDocuments<
    D extends RecordAny = T,
    S extends SearchParams = SearchParams,
  >(params: SearchSimilarDocumentsParams): Promise<SearchResponse<D, S>> {
    return await this.httpRequest.post<SearchResponse<D, S>>({
      path: `indexes/${this.uid}/similar`,
      body: params,
    });
  }

  ///
  /// INDEX
  ///

  /**
   * Get index information.
   *
   * @returns Promise containing index information
   */
  async getRawInfo(): Promise<IndexObject> {
    const res = await this.httpRequest.get<IndexObject>({
      path: `indexes/${this.uid}`,
    });
    this.primaryKey = res.primaryKey;
    this.updatedAt = new Date(res.updatedAt);
    this.createdAt = new Date(res.createdAt);
    return res;
  }

  /**
   * Fetch and update Index information.
   *
   * @returns Promise to the current Index object with updated information
   */
  async fetchInfo(): Promise<this> {
    await this.getRawInfo();
    return this;
  }

  /**
   * Get Primary Key.
   *
   * @returns Promise containing the Primary Key of the index
   */
  async fetchPrimaryKey(): Promise<string | undefined> {
    this.primaryKey = (await this.getRawInfo()).primaryKey;
    return this.primaryKey;
  }

  /**
   * Create an index.
   *
   * @param uid - Unique identifier of the Index
   * @param options - Index options
   * @param config - Request configuration options
   * @returns Newly created Index object
   */
  static async create(
    uid: string,
    options: IndexOptions = {},
    config: Config,
  ): Promise<EnqueuedTask> {
    const req = new HttpRequests(config);
    const task = await req.post<EnqueuedTaskObject>({
      path: "indexes",
      body: { ...options, uid },
    });

    return new EnqueuedTask(task);
  }

  /**
   * Update an index.
   *
   * @param data - Data to update
   * @returns Promise to the current Index object with updated information
   */
  async update(data: IndexOptions): Promise<EnqueuedTask> {
    const task = await this.httpRequest.patch<EnqueuedTaskObject>({
      path: `indexes/${this.uid}`,
      body: data,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Delete an index.
   *
   * @returns Promise which resolves when index is deleted successfully
   */
  async delete(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// TASKS
  ///

  /**
   * Get the list of all the tasks of the index.
   *
   * @param parameters - Parameters to browse the tasks
   * @returns Promise containing all tasks
   */
  async getTasks(parameters?: TasksQuery): Promise<TasksResults> {
    return await this.tasks.getTasks({ ...parameters, indexUids: [this.uid] });
  }

  /**
   * Get one task of the index.
   *
   * @param taskUid - Task identifier
   * @returns Promise containing a task
   */
  async getTask(taskUid: number): Promise<Task> {
    return await this.tasks.getTask(taskUid);
  }

  /**
   * Wait for multiple tasks to be processed.
   *
   * @param taskUids - Tasks identifier
   * @param waitOptions - Options on timeout and interval
   * @returns Promise containing an array of tasks
   */
  async waitForTasks(
    taskUids: number[],
    { timeOutMs = 5000, intervalMs = 50 }: WaitOptions = {},
  ): Promise<Task[]> {
    return await this.tasks.waitForTasks(taskUids, {
      timeOutMs,
      intervalMs,
    });
  }

  /**
   * Wait for a task to be processed.
   *
   * @param taskUid - Task identifier
   * @param waitOptions - Options on timeout and interval
   * @returns Promise containing an array of tasks
   */
  async waitForTask(
    taskUid: number,
    { timeOutMs = 5000, intervalMs = 50 }: WaitOptions = {},
  ): Promise<Task> {
    return await this.tasks.waitForTask(taskUid, {
      timeOutMs,
      intervalMs,
    });
  }

  ///
  /// STATS
  ///

  /**
   * Get stats of an index
   *
   * @returns Promise containing object with stats of the index
   */
  async getStats(): Promise<IndexStats> {
    return await this.httpRequest.get<IndexStats>({
      path: `indexes/${this.uid}/stats`,
    });
  }

  ///
  /// DOCUMENTS
  ///

  /**
   * Get documents of an index.
   *
   * @param params - Parameters to browse the documents. Parameters can contain
   *   the `filter` field only available in Meilisearch v1.2 and newer
   * @returns Promise containing the returned documents
   */
  async getDocuments<D extends RecordAny = T>(
    params?: DocumentsQuery<D>,
  ): Promise<ResourceResults<D[]>> {
    const relativeBaseURL = `indexes/${this.uid}/documents`;

    // In case `filter` is provided, use `POST /documents/fetch`
    if (params?.filter !== undefined) {
      return await this.httpRequest.post<ResourceResults<D[]>>({
        path: `${relativeBaseURL}/fetch`,
        body: params,
      });
    } else {
      // Else use `GET /documents` method
      return await this.httpRequest.get<ResourceResults<D[]>>({
        path: relativeBaseURL,
        params,
      });
    }
  }

  /**
   * Get one document
   *
   * @param documentId - Document ID
   * @param parameters - Parameters applied on a document
   * @returns Promise containing Document response
   */
  async getDocument<D extends RecordAny = T>(
    documentId: string | number,
    parameters?: DocumentQuery<T>,
  ): Promise<D> {
    const fields = (() => {
      if (Array.isArray(parameters?.fields)) {
        return parameters?.fields?.join(",");
      }
      return undefined;
    })();

    return await this.httpRequest.get<D>({
      path: `indexes/${this.uid}/documents/${documentId}`,
      params: { ...parameters, fields },
    });
  }

  /**
   * Add or replace multiples documents to an index
   *
   * @param documents - Array of Document objects to add/replace
   * @param options - Options on document addition
   * @returns Promise containing an EnqueuedTask
   */
  async addDocuments(
    documents: T[],
    options?: DocumentOptions,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.post<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/documents`,
      params: options,
      body: documents,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Add or replace multiples documents in a string format to an index. It only
   * supports csv, ndjson and json formats.
   *
   * @param documents - Documents provided in a string to add/replace
   * @param contentType - Content type of your document:
   *   'text/csv'|'application/x-ndjson'|'application/json'
   * @param options - Options on document addition
   * @returns Promise containing an EnqueuedTask
   */
  async addDocumentsFromString(
    documents: string,
    contentType: ContentType,
    queryParams?: RawDocumentAdditionOptions,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.post<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/documents`,
      body: documents,
      params: queryParams,
      contentType,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Add or replace multiples documents to an index in batches
   *
   * @param documents - Array of Document objects to add/replace
   * @param batchSize - Size of the batch
   * @param options - Options on document addition
   * @returns Promise containing array of enqueued task objects for each batch
   */
  async addDocumentsInBatches(
    documents: T[],
    batchSize = 1000,
    options?: DocumentOptions,
  ): Promise<EnqueuedTask[]> {
    const updates = [];
    for (let i = 0; i < documents.length; i += batchSize) {
      updates.push(
        await this.addDocuments(documents.slice(i, i + batchSize), options),
      );
    }
    return updates;
  }

  /**
   * Add or update multiples documents to an index
   *
   * @param documents - Array of Document objects to add/update
   * @param options - Options on document update
   * @returns Promise containing an EnqueuedTask
   */
  async updateDocuments(
    documents: Partial<T>[],
    options?: DocumentOptions,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/documents`,
      params: options,
      body: documents,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Add or update multiples documents to an index in batches
   *
   * @param documents - Array of Document objects to add/update
   * @param batchSize - Size of the batch
   * @param options - Options on document update
   * @returns Promise containing array of enqueued task objects for each batch
   */
  async updateDocumentsInBatches(
    documents: Partial<T>[],
    batchSize = 1000,
    options?: DocumentOptions,
  ): Promise<EnqueuedTask[]> {
    const updates = [];
    for (let i = 0; i < documents.length; i += batchSize) {
      updates.push(
        await this.updateDocuments(documents.slice(i, i + batchSize), options),
      );
    }
    return updates;
  }

  /**
   * Add or update multiples documents in a string format to an index. It only
   * supports csv, ndjson and json formats.
   *
   * @param documents - Documents provided in a string to add/update
   * @param contentType - Content type of your document:
   *   'text/csv'|'application/x-ndjson'|'application/json'
   * @param queryParams - Options on raw document addition
   * @returns Promise containing an EnqueuedTask
   */
  async updateDocumentsFromString(
    documents: string,
    contentType: ContentType,
    queryParams?: RawDocumentAdditionOptions,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/documents`,
      body: documents,
      params: queryParams,
      contentType,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Delete one document
   *
   * @param documentId - Id of Document to delete
   * @returns Promise containing an EnqueuedTask
   */
  async deleteDocument(documentId: string | number): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/documents/${documentId}`,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Delete multiples documents of an index.
   *
   * @param params - Params value can be:
   *
   *   - DocumentsDeletionQuery: An object containing the parameters to customize
   *       your document deletion. Only available in Meilisearch v1.2 and newer
   *   - DocumentsIds: An array of document ids to delete
   *
   * @returns Promise containing an EnqueuedTask
   */
  async deleteDocuments(
    params: DocumentsDeletionQuery | DocumentsIds,
  ): Promise<EnqueuedTask> {
    // If params is of type DocumentsDeletionQuery
    const isDocumentsDeletionQuery =
      !Array.isArray(params) && typeof params === "object";
    const endpoint = isDocumentsDeletionQuery
      ? "documents/delete"
      : "documents/delete-batch";

    const task = await this.httpRequest.post<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/${endpoint}`,
      body: params,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Delete all documents of an index
   *
   * @returns Promise containing an EnqueuedTask
   */
  async deleteAllDocuments(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/documents`,
    });

    return new EnqueuedTask(task);
  }

  /**
   * This is an EXPERIMENTAL feature, which may break without a major version.
   * It's available after Meilisearch v1.10.
   *
   * More info about the feature:
   * https://github.com/orgs/meilisearch/discussions/762 More info about
   * experimental features in general:
   * https://www.meilisearch.com/docs/reference/api/experimental-features
   *
   * @param options - Object containing the function string and related options
   * @returns Promise containing an EnqueuedTask
   */
  async updateDocumentsByFunction(
    options: UpdateDocumentsByFunctionOptions,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.post<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/documents/edit`,
      body: options,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// SETTINGS
  ///

  /**
   * Retrieve all settings
   *
   * @returns Promise containing Settings object
   */
  async getSettings(): Promise<Settings> {
    return await this.httpRequest.get<Settings>({
      path: `indexes/${this.uid}/settings`,
    });
  }

  /**
   * Update all settings Any parameters not provided will be left unchanged.
   *
   * @param settings - Object containing parameters with their updated values
   * @returns Promise containing an EnqueuedTask
   */
  async updateSettings(settings: Settings): Promise<EnqueuedTask> {
    const task = await this.httpRequest.patch<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings`,
      body: settings,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset settings.
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetSettings(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// PAGINATION SETTINGS
  ///

  /**
   * Get the pagination settings.
   *
   * @returns Promise containing object of pagination settings
   */
  async getPagination(): Promise<PaginationSettings> {
    return await this.httpRequest.get<PaginationSettings>({
      path: `indexes/${this.uid}/settings/pagination`,
    });
  }

  /**
   * Update the pagination settings.
   *
   * @param pagination - Pagination object
   * @returns Promise containing an EnqueuedTask
   */
  async updatePagination(
    pagination: PaginationSettings,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.patch<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/pagination`,
      body: pagination,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the pagination settings.
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetPagination(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/pagination`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// SYNONYMS
  ///

  /**
   * Get the list of all synonyms
   *
   * @returns Promise containing record of synonym mappings
   */
  async getSynonyms(): Promise<Record<string, string[]>> {
    return await this.httpRequest.get<Record<string, string[]>>({
      path: `indexes/${this.uid}/settings/synonyms`,
    });
  }

  /**
   * Update the list of synonyms. Overwrite the old list.
   *
   * @param synonyms - Mapping of synonyms with their associated words
   * @returns Promise containing an EnqueuedTask
   */
  async updateSynonyms(synonyms: Synonyms): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/synonyms`,
      body: synonyms,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the synonym list to be empty again
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetSynonyms(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/synonyms`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// STOP WORDS
  ///

  /**
   * Get the list of all stop-words
   *
   * @returns Promise containing array of stop-words
   */
  async getStopWords(): Promise<string[]> {
    return await this.httpRequest.get<string[]>({
      path: `indexes/${this.uid}/settings/stop-words`,
    });
  }

  /**
   * Update the list of stop-words. Overwrite the old list.
   *
   * @param stopWords - Array of strings that contains the stop-words.
   * @returns Promise containing an EnqueuedTask
   */
  async updateStopWords(stopWords: StopWords): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/stop-words`,
      body: stopWords,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the stop-words list to be empty again
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetStopWords(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/stop-words`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// RANKING RULES
  ///

  /**
   * Get the list of all ranking-rules
   *
   * @returns Promise containing array of ranking-rules
   */
  async getRankingRules(): Promise<string[]> {
    return await this.httpRequest.get<string[]>({
      path: `indexes/${this.uid}/settings/ranking-rules`,
    });
  }

  /**
   * Update the list of ranking-rules. Overwrite the old list.
   *
   * @param rankingRules - Array that contain ranking rules sorted by order of
   *   importance.
   * @returns Promise containing an EnqueuedTask
   */
  async updateRankingRules(rankingRules: RankingRules): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/ranking-rules`,
      body: rankingRules,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the ranking rules list to its default value
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetRankingRules(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/ranking-rules`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// DISTINCT ATTRIBUTE
  ///

  /**
   * Get the distinct-attribute
   *
   * @returns Promise containing the distinct-attribute of the index
   */
  async getDistinctAttribute(): Promise<DistinctAttribute> {
    return await this.httpRequest.get<DistinctAttribute>({
      path: `indexes/${this.uid}/settings/distinct-attribute`,
    });
  }

  /**
   * Update the distinct-attribute.
   *
   * @param distinctAttribute - Field name of the distinct-attribute
   * @returns Promise containing an EnqueuedTask
   */
  async updateDistinctAttribute(
    distinctAttribute: DistinctAttribute,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/distinct-attribute`,
      body: distinctAttribute,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the distinct-attribute.
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetDistinctAttribute(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/distinct-attribute`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// FILTERABLE ATTRIBUTES
  ///

  /**
   * Get the filterable-attributes
   *
   * @returns Promise containing an array of filterable-attributes
   */
  async getFilterableAttributes(): Promise<string[]> {
    return await this.httpRequest.get<string[]>({
      path: `indexes/${this.uid}/settings/filterable-attributes`,
    });
  }

  /**
   * Update the filterable-attributes.
   *
   * @param filterableAttributes - Array of strings containing the attributes
   *   that can be used as filters at query time
   * @returns Promise containing an EnqueuedTask
   */
  async updateFilterableAttributes(
    filterableAttributes: FilterableAttributes,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/filterable-attributes`,
      body: filterableAttributes,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the filterable-attributes.
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetFilterableAttributes(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/filterable-attributes`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// SORTABLE ATTRIBUTES
  ///

  /**
   * Get the sortable-attributes
   *
   * @returns Promise containing array of sortable-attributes
   */
  async getSortableAttributes(): Promise<string[]> {
    return await this.httpRequest.get<string[]>({
      path: `indexes/${this.uid}/settings/sortable-attributes`,
    });
  }

  /**
   * Update the sortable-attributes.
   *
   * @param sortableAttributes - Array of strings containing the attributes that
   *   can be used to sort search results at query time
   * @returns Promise containing an EnqueuedTask
   */
  async updateSortableAttributes(
    sortableAttributes: SortableAttributes,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/sortable-attributes`,
      body: sortableAttributes,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the sortable-attributes.
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetSortableAttributes(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/sortable-attributes`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// SEARCHABLE ATTRIBUTE
  ///

  /**
   * Get the searchable-attributes
   *
   * @returns Promise containing array of searchable-attributes
   */
  async getSearchableAttributes(): Promise<string[]> {
    return await this.httpRequest.get<string[]>({
      path: `indexes/${this.uid}/settings/searchable-attributes`,
    });
  }

  /**
   * Update the searchable-attributes.
   *
   * @param searchableAttributes - Array of strings that contains searchable
   *   attributes sorted by order of importance(most to least important)
   * @returns Promise containing an EnqueuedTask
   */
  async updateSearchableAttributes(
    searchableAttributes: SearchableAttributes,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/searchable-attributes`,
      body: searchableAttributes,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the searchable-attributes.
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetSearchableAttributes(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/searchable-attributes`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// DISPLAYED ATTRIBUTE
  ///

  /**
   * Get the displayed-attributes
   *
   * @returns Promise containing array of displayed-attributes
   */
  async getDisplayedAttributes(): Promise<string[]> {
    return await this.httpRequest.get<string[]>({
      path: `indexes/${this.uid}/settings/displayed-attributes`,
    });
  }

  /**
   * Update the displayed-attributes.
   *
   * @param displayedAttributes - Array of strings that contains attributes of
   *   an index to display
   * @returns Promise containing an EnqueuedTask
   */
  async updateDisplayedAttributes(
    displayedAttributes: DisplayedAttributes,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/displayed-attributes`,
      body: displayedAttributes,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the displayed-attributes.
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetDisplayedAttributes(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/displayed-attributes`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// TYPO TOLERANCE
  ///

  /**
   * Get the typo tolerance settings.
   *
   * @returns Promise containing the typo tolerance settings.
   */
  async getTypoTolerance(): Promise<TypoTolerance> {
    return await this.httpRequest.get<TypoTolerance>({
      path: `indexes/${this.uid}/settings/typo-tolerance`,
    });
  }

  /**
   * Update the typo tolerance settings.
   *
   * @param typoTolerance - Object containing the custom typo tolerance
   *   settings.
   * @returns Promise containing object of the enqueued update
   */
  async updateTypoTolerance(
    typoTolerance: TypoTolerance,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.patch<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/typo-tolerance`,
      body: typoTolerance,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the typo tolerance settings.
   *
   * @returns Promise containing object of the enqueued update
   */
  async resetTypoTolerance(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/typo-tolerance`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// FACETING
  ///

  /**
   * Get the faceting settings.
   *
   * @returns Promise containing object of faceting index settings
   */
  async getFaceting(): Promise<Faceting> {
    return await this.httpRequest.get<Faceting>({
      path: `indexes/${this.uid}/settings/faceting`,
    });
  }

  /**
   * Update the faceting settings.
   *
   * @param faceting - Faceting index settings object
   * @returns Promise containing an EnqueuedTask
   */
  async updateFaceting(faceting: Faceting): Promise<EnqueuedTask> {
    const task = await this.httpRequest.patch<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/faceting`,
      body: faceting,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the faceting settings.
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetFaceting(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/faceting`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// SEPARATOR TOKENS
  ///

  /**
   * Get the list of all separator tokens.
   *
   * @returns Promise containing array of separator tokens
   */
  async getSeparatorTokens(): Promise<string[]> {
    return await this.httpRequest.get<string[]>({
      path: `indexes/${this.uid}/settings/separator-tokens`,
    });
  }

  /**
   * Update the list of separator tokens. Overwrite the old list.
   *
   * @param separatorTokens - Array that contains separator tokens.
   * @returns Promise containing an EnqueuedTask or null
   */
  async updateSeparatorTokens(
    separatorTokens: SeparatorTokens,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/separator-tokens`,
      body: separatorTokens,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the separator tokens list to its default value
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetSeparatorTokens(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/separator-tokens`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// NON-SEPARATOR TOKENS
  ///

  /**
   * Get the list of all non-separator tokens.
   *
   * @returns Promise containing array of non-separator tokens
   */
  async getNonSeparatorTokens(): Promise<string[]> {
    return await this.httpRequest.get<string[]>({
      path: `indexes/${this.uid}/settings/non-separator-tokens`,
    });
  }

  /**
   * Update the list of non-separator tokens. Overwrite the old list.
   *
   * @param nonSeparatorTokens - Array that contains non-separator tokens.
   * @returns Promise containing an EnqueuedTask or null
   */
  async updateNonSeparatorTokens(
    nonSeparatorTokens: NonSeparatorTokens,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/non-separator-tokens`,
      body: nonSeparatorTokens,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the non-separator tokens list to its default value
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetNonSeparatorTokens(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/non-separator-tokens`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// DICTIONARY
  ///

  /**
   * Get the dictionary settings of a Meilisearch index.
   *
   * @returns Promise containing the dictionary settings
   */
  async getDictionary(): Promise<string[]> {
    return await this.httpRequest.get<string[]>({
      path: `indexes/${this.uid}/settings/dictionary`,
    });
  }

  /**
   * Update the dictionary settings. Overwrite the old settings.
   *
   * @param dictionary - Array that contains the new dictionary settings.
   * @returns Promise containing an EnqueuedTask or null
   */
  async updateDictionary(dictionary: Dictionary): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/dictionary`,
      body: dictionary,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the dictionary settings to its default value
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetDictionary(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/dictionary`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// PROXIMITY PRECISION
  ///

  /**
   * Get the proximity precision settings of a Meilisearch index.
   *
   * @returns Promise containing the proximity precision settings
   */
  async getProximityPrecision(): Promise<ProximityPrecision> {
    return await this.httpRequest.get<ProximityPrecision>({
      path: `indexes/${this.uid}/settings/proximity-precision`,
    });
  }

  /**
   * Update the proximity precision settings. Overwrite the old settings.
   *
   * @param proximityPrecision - String that contains the new proximity
   *   precision settings.
   * @returns Promise containing an EnqueuedTask or null
   */
  async updateProximityPrecision(
    proximityPrecision: ProximityPrecision,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/proximity-precision`,
      body: proximityPrecision,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the proximity precision settings to its default value
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetProximityPrecision(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/proximity-precision`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// EMBEDDERS
  ///

  /**
   * Get the embedders settings of a Meilisearch index.
   *
   * @returns Promise containing the embedders settings
   */
  async getEmbedders(): Promise<Embedders> {
    return await this.httpRequest.get<Embedders>({
      path: `indexes/${this.uid}/settings/embedders`,
    });
  }

  /**
   * Update the embedders settings. Overwrite the old settings.
   *
   * @param embedders - Object that contains the new embedders settings.
   * @returns Promise containing an EnqueuedTask or null
   */
  async updateEmbedders(embedders: Embedders): Promise<EnqueuedTask> {
    const task = await this.httpRequest.patch<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/embedders`,
      body: embedders,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the embedders settings to its default value
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetEmbedders(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/embedders`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// SEARCHCUTOFFMS SETTINGS
  ///

  /**
   * Get the SearchCutoffMs settings.
   *
   * @returns Promise containing object of SearchCutoffMs settings
   */
  async getSearchCutoffMs(): Promise<SearchCutoffMs> {
    return await this.httpRequest.get<SearchCutoffMs>({
      path: `indexes/${this.uid}/settings/search-cutoff-ms`,
    });
  }

  /**
   * Update the SearchCutoffMs settings.
   *
   * @param searchCutoffMs - Object containing SearchCutoffMsSettings
   * @returns Promise containing an EnqueuedTask
   */
  async updateSearchCutoffMs(
    searchCutoffMs: SearchCutoffMs,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/search-cutoff-ms`,
      body: searchCutoffMs,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the SearchCutoffMs settings.
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetSearchCutoffMs(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/search-cutoff-ms`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// LOCALIZED ATTRIBUTES SETTINGS
  ///

  /**
   * Get the localized attributes settings.
   *
   * @returns Promise containing object of localized attributes settings
   */
  async getLocalizedAttributes(): Promise<LocalizedAttributes> {
    return await this.httpRequest.get<LocalizedAttributes>({
      path: `indexes/${this.uid}/settings/localized-attributes`,
    });
  }

  /**
   * Update the localized attributes settings.
   *
   * @param localizedAttributes - Localized attributes object
   * @returns Promise containing an EnqueuedTask
   */
  async updateLocalizedAttributes(
    localizedAttributes: LocalizedAttributes,
  ): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/localized-attributes`,
      body: localizedAttributes,
    });

    return new EnqueuedTask(task);
  }

  /**
   * Reset the localized attributes settings.
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetLocalizedAttributes(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/localized-attributes`,
    });

    return new EnqueuedTask(task);
  }

  ///
  /// FACET SEARCH SETTINGS
  ///

  /**
   * Get the facet search settings.
   *
   * @returns Promise containing object of facet search settings
   */
  async getFacetSearch(): Promise<boolean> {
    return await this.httpRequest.get<boolean>({
      path: `indexes/${this.uid}/settings/facet-search`,
    });
  }

  /**
   * Update the facet search settings.
   *
   * @param facetSearch - Boolean value
   * @returns Promise containing an EnqueuedTask
   */
  async updateFacetSearch(facetSearch: boolean): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/facet-search`,
      body: facetSearch,
    });
    return new EnqueuedTask(task);
  }

  /**
   * Reset the facet search settings.
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetFacetSearch(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/facet-search`,
    });
    return new EnqueuedTask(task);
  }

  ///
  /// PREFIX SEARCH SETTINGS
  ///

  /**
   * Get the prefix search settings.
   *
   * @returns Promise containing object of prefix search settings
   */
  async getPrefixSearch(): Promise<PrefixSearch> {
    return await this.httpRequest.get<PrefixSearch>({
      path: `indexes/${this.uid}/settings/prefix-search`,
    });
  }

  /**
   * Update the prefix search settings.
   *
   * @param prefixSearch - PrefixSearch value
   * @returns Promise containing an EnqueuedTask
   */
  async updatePrefixSearch(prefixSearch: PrefixSearch): Promise<EnqueuedTask> {
    const task = await this.httpRequest.put<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/prefix-search`,
      body: prefixSearch,
    });
    return new EnqueuedTask(task);
  }

  /**
   * Reset the prefix search settings.
   *
   * @returns Promise containing an EnqueuedTask
   */
  async resetPrefixSearch(): Promise<EnqueuedTask> {
    const task = await this.httpRequest.delete<EnqueuedTaskObject>({
      path: `indexes/${this.uid}/settings/prefix-search`,
    });
    return new EnqueuedTask(task);
  }
}

export { Index };
