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

class Background {
  // static constants
  static CONSTANTS = {
    EVENTS: {
      GALLERY: {
        SET: 'gallery-set',
        RESET: 'gallery-reset',
      },
      OPTIONS: {
        SET: 'options-set',
        RESET: 'options-reset',
      },
    },
    // identifies listener target for message
    TARGET: {
      B: 'background',
      C: 'content',
      P: 'popup',
    },
    ACTION: {
      GET: 'getGalleries',
      NEW: 'createGallery',
      DEL: 'deleteGallery',
      DIR: 'getContent',
      ADD: 'addContent',
      REM: 'removeContent',
    },
    RESPONSE: {
      GET: 'getGalleriesResponse',
      NEW: 'createGalleryResponse',
      DEL: 'deleteGalleryResponse',
      DIR: 'getContentResponse',
      ADD: 'addContentResponse',
      REM: 'removeContentResponse',
      ERROR: 'Error',
    },
    ENV: {
      PROD: ['stock.adobe', 'contributor.stock.adobe'],
      STAGE: ['primary.stock.stage.adobe', 'staging1.contributors.adobestock', 'sandbox.stock.stage.adobe'],
      DEV: ['adobestock.dev', 'contributors.dev'],
    },
    // key values for local storage
    DATA: {
      getGalleriesResponse: {
        BASE: 'galleries',
        COUNT: 'nb_results',
        MAP: [
          'name',
          'nb_media',
          'id',
        ],
        LIMIT: 100, // api request limit
      },
      getContentResponse: {
        BASE: 'files',
        COUNT: 'nb_results',
        MAP: [
          'id',
          'title',
          'width',
          'height',
          'nb_downloads',
          'thumbnail_url',
          'href',
        ],
        LIMIT: 100, // api request limit
      },
      TOKEN: 'access_token',
      GALLERY: 'selectedGallery',
      URL: 'endpoint',
      API_KEY: 'apiKey',
      ENV: 'environment',
      POPUP: 'helper',
      STOCK_TAB: 'activeTab',
    },
    ERROR_CODES: {
      TOKEN_PROBLEM: 999,
    },
  }

  // stores data in local storage
  static store(obj, cb = null) {
    if (chrome.storage) {
      chrome.storage.local.set(obj, cb || (() => {
        const key = Object.keys(obj)[0];
        chrome.storage.local.get(key, (item) => {
          console.log(`Stored ${key}:`, item[key]);
        });
      }));
    }
  }

  // gets data and returns promise for chaining
  static retrieve(key) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(key, (item) => {
        if (chrome.runtime.lastError) {
          const msg = chrome.runtime.lastError.message;
          console.error(msg);
          reject(msg);
        } else {
          resolve(item[key]);
        }
      });
    });
  }

  static emptyStorage() {
    chrome.storage.local.clear();
  }

  // broadcasts messages to chrome runtime
  static notify(msg) {
    const { STOCK_TAB, POPUP } = Background.CONSTANTS.DATA;
    const { TARGET } = Background.CONSTANTS;
    // is message for content page or popup?
    const destination = (msg && msg.target && msg.target === TARGET.P) ? POPUP : STOCK_TAB;
    Background.retrieve(destination).then((t) => {
      const activeTab = t;
      if (activeTab) {
        chrome.tabs.query({ active: true, currentWindow: true }, () => {
          chrome.tabs.sendMessage(activeTab.id, msg);
        });
      } else console.error(`Target tab not defined yet for: ${JSON.stringify(msg)}`);
    });
  }

  // get runtime environment
  static getEnvironment(url) {
    const re = /(https?:\/\/)(.*)\.(com|loc)/;
    let env;
    const match = (re.exec(url) && re.exec(url)[2]) ? re.exec(url)[2] : null;
    if (match) {
      Object.entries(Background.CONSTANTS.ENV).forEach(([key, value]) => {
        if (value.includes(match)) {
          env = key;
        }
      });
    }
    return env || 'PROD';
  }

  // makes service call
  static async callStockService(method, input, pageModel) {
    // eslint-disable-next-line no-undef
    const svc = stock;
    const { retrieve, CONSTANTS: K } = Background;
    const env = retrieve(K.DATA.ENV);
    const token = retrieve(K.DATA.TOKEN);
    const args = await Promise.all([
      env, token,
    ]).then(([e, t]) => {
      // if environment is undefined, use PROD
      const environment = (!e) ? 'PROD' : e;
      if (!t) {
        // TODO: Fix response and fix issue where opening Stock site in new tab breaks plugin
        throw svc.http.parseErrors({ code: K.ERROR_CODES.TOKEN_PROBLEM });
      }
      return [environment, t];
    });
    // append any incoming parameters
    args.push(input);
    args.push(pageModel);
    // calls {method} from services
    try {
      const response = await svc[method].apply(null, args);
      console.log(response);
      return response;
    } catch (e) {
      // return either a JS error message or internal error string
      throw (e.message || e);
    }
  }
}

const {
  store,
  retrieve,
  emptyStorage,
  notify,
  callStockService,
  getEnvironment,
  CONSTANTS: K,
} = Background;

// called when popup closes or galleries are refreshed
function onGalleryReset() {
  // reset gallery data
  store({
    [K.DATA.GALLERY]: {
      id: '', name: '',
    },
  });
  // forward notification to content
  notify({ status: K.EVENTS.GALLERY.RESET });
}

// called when gallery is updated
async function onGalleryReady(input) {
  let gallery;
  if (!input) {
    // check if gallery exists and remap prop names
    gallery = await retrieve(K.DATA.GALLERY);
  } else {
    gallery = input;
  }
  if (gallery) {
    // notify content script that gallery is set
    notify({
      status: K.EVENTS.GALLERY.SET,
      data: gallery,
      target: K.TARGET.C,
    });
  } else {
    onGalleryReset();
  }
}

// execute workflows initiated by 'action' message
function actionHandler(msg) {
  const input = msg.data;
  let status;
  let pageModel;
  const { action } = msg;
  switch (msg.action) {
    case K.ACTION.GET: {
      status = K.RESPONSE.GET;
      // attach data object for pagination support
      const { BASE, COUNT, LIMIT } = K.DATA[status];
      pageModel = { BASE, COUNT, LIMIT };
      break;
    }
    case K.ACTION.NEW: {
      status = K.RESPONSE.NEW;
      break;
    }
    case K.ACTION.DEL: {
      status = K.RESPONSE.DEL;
      break;
    }
    case K.ACTION.DIR: {
      status = K.RESPONSE.DIR;
      // store current galleryId and name
      store({
        [K.DATA.GALLERY]: input,
      });
      // notify content that gallery is set
      onGalleryReady(input);
      // attach data object for pagination support
      const { BASE, COUNT, LIMIT } = K.DATA[status];
      pageModel = { BASE, COUNT, LIMIT };
      break;
    }
    case K.ACTION.ADD: {
      status = K.RESPONSE.ADD;
      break;
    }
    case K.ACTION.REM: {
      status = K.RESPONSE.REM;
      break;
    }
    default:
      console.error(`Unknown action ${action}`);
      break;
  }
  let responseData;
  callStockService(action, input, pageModel)
    .then((data) => {
      responseData = data;
    }).catch((e) => {
      console.error(e);
      status = K.RESPONSE.ERROR;
      responseData = e;
    }).finally(() => {
      const payload = {
        target: K.TARGET.P,
        data: responseData,
        status,
      };
      console.log(payload);
      notify(payload);
    });
}

// LISTENERS

// clear storage on extension update
chrome.runtime.onInstalled.addListener(() => {
  emptyStorage();
});

// listen for popup closing event
chrome.tabs.onRemoved.addListener((tabId) => {
  retrieve(K.DATA.POPUP).then((t) => {
    if (t && t.id === tabId) {
      console.log('popup closing from %s', tabId);
      // remove popup
      store({ [K.DATA.POPUP]: null });
      // clear gallery data and notify ui
      onGalleryReset();
    }
  });
});

// listen for messages from content and popup script
chrome.runtime.onMessage.addListener((message, sender) => {
  console.log(message);
  // if message contains an action that needs to be executed
  if (message.action) actionHandler(message);
  // otherwise handle status updates
  switch (message.status) {
    case 'CONTENT_READY':
      break;
    case 'CONTENT_STATUS_READY': {
      retrieve(K.DATA.STOCK_TAB).then((t) => {
        const activeTab = t || sender.tab;
        // store Stock tab
        console.log(`storing Stock tab with id ${activeTab.id}`);
        store({ [K.DATA.STOCK_TAB]: activeTab }, () => {
          notify({ status: 'BACKGROUND_READY' });
          const environment = getEnvironment(sender.url);
          notify({ status: 'ENVIRONMENT_READY', data: environment });
          store({ [K.DATA.ENV]: environment });
          // check if gallery exists and notify ui
          onGalleryReady();
        });
      });
      break;
    }
    case 'POPUP_READY':
      console.log('popup opened');
      // store popup id
      store({ [K.DATA.POPUP]: message.activeTab });
      break;
    case 'TOKEN_READY':
      store({ [K.DATA.TOKEN]: message.data }, () => {
        chrome.pageAction.show(sender.tab.id, () => {
          const manifest = chrome.runtime.getManifest();
          const tabId = sender.tab.id;
          chrome.pageAction.setIcon({
            tabId,
            path: manifest.page_action.active_icon,
          });
          chrome.pageAction.setTitle({
            tabId,
            title: manifest.page_action.active_title,
          });
        });
      });
      console.log('token ready');
      break;
    case 'TOKEN_PROBLEM':
      // disable icon button until token available
      chrome.pageAction.hide(sender.tab.id, () => {
        const manifest = chrome.runtime.getManifest();
        const tabId = sender.tab.id;
        chrome.pageAction.setIcon({
          tabId,
          path: manifest.page_action.default_icon,
        });
        chrome.pageAction.setTitle({
          tabId,
          title: manifest.page_action.default_title,
        });
      });
      console.error('token not ready');
      break;
    case K.EVENTS.GALLERY.RESET: {
      onGalleryReset();
      break;
    }
    default:
      break;
  }
});

// listens for click on extension
chrome.pageAction.onClicked.addListener(() => {
  const openTab = ((tab) => {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError.message);
      throw (chrome.runtime.lastError.message);
    } else {
      chrome.tabs.highlight({
        tabs: tab.index,
      });
    }
  });

  // get id for popup tab
  retrieve(K.DATA.POPUP).then(({ id }) => {
    console.log(`switching to tab ${id}`);
    chrome.tabs.get(id, openTab);
  }).catch(() => {
    // create popup and store tab id
    chrome.tabs.create({
      url: chrome.extension.getURL('popup.html'),
      active: true,
    }, (t) => {
      console.log(`created tab with id ${t.id}`);
      store({ [K.DATA.POPUP]: t });
    });
  });
});
