/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const stock = {};

stock.CFG = {
  API_KEY: {
    PROD: '***REMOVED***',
  },
  URL: {
    PROD: '***REMOVED***',
  },
  SEARCH: {
    PROD: 'https://stock.adobe.io',
    ENDPOINT: 'Rest/Media/1/Search/Files',
    SETID: (id) => `search_parameters[gallery_id]=${id}`,
    PAGE_DEFAULT: (limit, page) => `&search_parameters[limit]=${limit}&search_parameters[offset]=${(page - 1) * limit}`,
  },
  // returns pagination parameters
  PAGE_DEFAULT: (l, p) => `?limit=${l}&page=${p}`,
  HEADERS: (env, token) => {
    const key = stock.CFG.API_KEY;
    const headers = {
      Accept: 'application/vnd.adobe.stockcontrib.v2',
      'x-api-key': key[env],
      'x-product': 'StockGalleryHelper',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  },
};

stock.http = {
  // gets a user-friendly error
  parseErrors: async (res) => {
    const { code, message } = await res;
    let msg = '';
    switch (code) {
      case 110:
        msg = 'You are not a Stock Contributor. You first visit <a href="https://contributor.stock.adobe.com">Adobe Stock Contributor</a> to register.';
        break;
      case 111:
        msg = 'You must be signed into Adobe Stock to use this extension. Close the popup and sign into Stock in the main window before re-opening.';
        break;
      case 200:
        msg = 'There are no valid content IDs in the gallery to be imported or the gallery is empty. Please check the ID before trying again.';
        break;
      case 2401:
        msg = 'Gallery ID is not valid for your account.';
        break;
      case 404:
        msg = 'There is a problem with the URL.';
        break;
      case 403003:
        msg = 'The API key is invalid.';
        break;
      case 999:
        msg = 'Access token not found. Please reload Stock page and re-open extension.';
        break;
      default:
        msg = (message || 'Adobe Stock is reporting an error.');
    }
    throw msg;
  },
  // executes fetch and returns promise
  send: (req) => {
    // const { params } = req;
    const url = new URL(req.url);
    // url.search = new URLSearchParams(params);
    const headers = stock.CFG.HEADERS(req.env, req.token);
    const { method } = req; // eslint: method = req.method
    let body = null;
    if (method === 'POST') {
      body = JSON.stringify(req.body);
      headers['Content-Type'] = 'application/json';
    }
    const fetchRequest = new Request(url, {
      method, headers, body, credentials: 'omit', cache: 'no-store', redirect: 'error', mode: 'cors',
    });
    // console.log(fetchRequest);
    const request = fetch(fetchRequest).then((response) => {
      // clone response so it can be edited
      // see https://stackoverflow.com/a/54115314
      const res = response.clone();
      if (!res.ok) {
        console.error(res.statusText);
        // const msg = (({ status } = res) => {
        // adobe.io returns HTML 404 error!
        // create "code" 404
        if (res.status === 404) {
          throw stock.http.parseErrors({ code: res.status });
        }
        throw stock.http.parseErrors(res.json());
      } else if (res.status === 204) {
        // deletion action
        return { message: 'delete successful' };
      }
      // parse JSON from fetch body
      // see https://developer.mozilla.org/en-US/docs/Web/API/Body/json
      return res.json();
    }).catch((e) => {
      // check for bad domain
      if (e.message === 'Failed to fetch' && e.name === 'TypeError') {
        e.message = 'Unable to call Galleries API. Please check Gallery URL in options.';
      }
      return e;
    });
    return request;
  },
};

stock.createGallery = async (env, token, title) => {
  // testing
  // const url = chrome.runtime.getURL('/background/other/creategallery1.json');
  const url = `${stock.CFG.URL[env]}`;
  if (!title) {
    throw Error('You must set a title to create a gallery');
  }
  const body = { title };
  const req = {
    url, token, env, method: 'POST', body,
  };
  const data = await stock.http.send(req);
  return data;
};

stock.deleteGallery = async (env, token, id) => {
  /*
  const mockResponse = new Response(null, {
    status: 204,
    statusText: 'No Content',
  });
  */
  const url = `${stock.CFG.URL[env]}/${id}`;
  const req = {
    url, token, env, method: 'DELETE',
  };
  const data = await stock.http.send(req);
  return data;
};

/**
 * calls endpoint multiple times using pagination until all results are loaded
 * @param {object} args - object containing request params
 * @returns {object} containing {int} totalResults and {array} totalData
 */
stock.getAllResults = async (args) => {
  const {
    url, env, token, model, pageParams,
  } = args;
  // get data model for method
  const { BASE, LIMIT } = model;
  const req = {
    token, env, method: 'GET',
  };
  let totalData = [];
  let page = 1;
  let totalPages = 0;
  let data;
  let totalResults;
  // TODO: Refactor to allow paginated call to search api
  do {
    // append pagination parameters to URL
    req.url = `${url}${pageParams(LIMIT, page)}`;
    console.log(req.url);
    // eslint-disable-next-line no-await-in-loop
    data = await stock.http.send(req);
    // append `files` array to totalData
    totalData = totalData.concat((data[BASE]) ? data[BASE] : []);
    // calculate remaining pages
    if (page === 1) {
      // get total items from response
      totalResults = data.nb_results;
      // divide by limit
      totalPages = Math.ceil((totalResults) / LIMIT);
    }
    page += 1;
  } while (totalPages >= page);
  return { totalResults, totalData };
};

stock.getGalleries = async (env, token, ...args) => {
  // STATIC testing
  // const url = chrome.runtime.getURL('/background/other/getgalleries_large1.json');
  const url = `${stock.CFG.URL[env]}`;
  const model = args[1];
  // define pagination commands
  const pageParams = stock.CFG.PAGE_DEFAULT;
  const data = await stock.getAllResults({
    url, env, token, model, pageParams,
  });
  return {
    [model.COUNT]: data.totalResults,
    [model.BASE]: data.totalData,
  };
};

stock.getContent = async (env, token, gallery, model) => {
  // const url = chrome.runtime.getURL('/background/other/getcontent_large1.json');
  const url = `${stock.CFG.URL[env]}/${gallery.id}`;
  // STK-63032: Store count from gallery row and send back as total
  const { count } = gallery; // STK-63032: Added
  // define pagination commands
  const pageParams = stock.CFG.PAGE_DEFAULT;
  const data = await stock.getAllResults({
    url, env, token, model, pageParams,
  });
  return {
    // [model.COUNT]: data.totalResults, // STK-63032 line replaced
    [model.COUNT]: count, // STK-63032
    [model.BASE]: data.totalData,
  };
};

stock.addContent = async (env, token, input) => {
  // const url = chrome.runtime.getURL('/background/other/getcontent1.json');
  const { id, contentIds } = input;
  const url = `${stock.CFG.URL[env]}/${id}`;
  // convert contentIds to string
  const body = { content_id: contentIds.toString() };
  const req = {
    url, token, env, method: 'POST', body,
  };
  const data = await stock.http.send(req);
  return data;
};

stock.removeContent = async (env, token, { id, contentId }) => {
  const url = `${stock.CFG.URL[env]}/${id}/${contentId}`;
  console.log(`Called content DELETE ${url}`);
  const req = {
    url, token, env, method: 'DELETE',
  };
  const data = await stock.http.send(req);
  return data;
};

/**
 * multi-step operation:
 * - uses Search API to read contents of gallery to import
 * - calls addContent method to add content to target gallery
 */
stock.importContent = async (env, token, { id, importId }, model) => {
  const searchUrlbase = `${stock.CFG.SEARCH[env]}/${stock.CFG.SEARCH.ENDPOINT}?${stock.CFG.SEARCH.SETID(importId)}`;
  console.log(`Starting content IMPORT for ${importId}`);

  // 1: Get total assets in gallery
  const url = `${searchUrlbase}&result_columns[]=nb_results&result_columns[]=id`;
  // define pagination commands
  const pageParams = stock.CFG.SEARCH.PAGE_DEFAULT;
  const assets = await stock.getAllResults({
    url, token: '', env, model, pageParams,
  });

  // 2: load all assets in target gallery (100 per request) until finished
  const assetLimit = 100;
  if (assets.totalResults) {
    const totalRequests = Math.ceil((assets.totalResults) / assetLimit);
    const { totalData } = assets;
    // keeps track of current request
    let requestIdx = 1;
    // array and index to temporarily populate with list of ~100 assets
    let assetList = [];
    let assetIdx = 0;
    do {
      // get first 100 assets and convert to flattened array of ids
      assetList = totalData.slice(assetIdx, assetIdx + assetLimit).map((asset) => asset.id);
      // if array is one item, convert to string else keep as array
      const list = ((assetList.length > 1) ? assetList : assetList.toString());
      const input = { id, contentIds: list };
      // eslint-disable-next-line no-await-in-loop
      const data = await stock.addContent(env, token, input);
      // response should be 201 with contents of gallery--but not showing up here?
      console.log(data);
      assetIdx += assetLimit;
      requestIdx += 1;
    } while (totalRequests >= requestIdx);

    // 3: notify UI that import is done, total added, and refresh gallery contents
    return assets.totalResults;
  }
  // throw error if there is nothing to import
  throw stock.http.parseErrors({ code: 200 });
};
