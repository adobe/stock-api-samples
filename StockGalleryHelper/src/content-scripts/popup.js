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

const Popup = (() => {
  // add static constants
  const K = {
    EVENTS: {
      GALLERY: {
        SET: 'gallery-set',
        RESET: 'gallery-reset',
      },
    },
    STOCK_URL: {
      PROD: 'https://stock.adobe.com/',
      DEV: 'https://sandbox.stock.stage.adobe.com/',
      STAGE: 'https://sandbox.stock.stage.adobe.com/',
    },
    // identifies listener target for message
    TARGET: {
      B: 'background',
      C: 'content',
      P: 'popup',
    },
    UI: {
      STATUS: {
        BANNER: {
          ID: '#statusBanner',
          STYLE_RESET: 'bg-dark',
          STYLE_SUCCESS: 'bg-success',
        },
        BG: {
          ID: '#statusBox',
          STYLE_RESET: 'border border-light',
          STYLE_SUCCESS: 'bg-light',
        },
        ID: {
          ID: '#statusGalleryName[data-id]',
          DEFAULT: 'none',
        },
        NAME: {
          ID: '#statusGalleryName',
          DEFAULT: 'None',
          STYLE_RESET: 'text-light',
          STYLE_SUCCESS: 'text-dark',
        },
        COUNT: {
          ID: '#statusGalleryCount',
          DEFAULT: 0,
          STYLE_SUCCESS: 'badge-success',
          STYLE_RESET: 'badge-warning',
        },
        STATE: {
          RESET: 'RESET',
          SUCCESS: 'SUCCESS',
        },
      },
      GALLERY: {
        TAB: '#manage-tab',
        TABLE: {
          ID: '#galleryTable',
        },
        FORM: {
          ID: '#newGalleryForm',
        },
        REFRESH: '#get-galleries',
        // sets listener delegate and target because link won't exist when turned on
        LINK: {
          // delegated target
          DEL: '#manage',
          // link target
          TARG: '#galleryTable tbody > tr > td a[rel="next"]',
        },
      },
      CONTENTS: {
        TAB: '#view-tab',
        TABLE: {
          ID: '#contentTable',
        },
        REFRESH: '#get-content',
      },
      MODAL: {
        ID: '#modal',
        BODY: '#modal .modal-body',
        TITLE: '#modalLabel',
        COLOR: '#modal .modal-header',
      },
      CONSENT: {
        ID: '#consentForm',
        MSG: 'label',
      },
      WAIT: '#loader',
      ALERT: {
        ID: '#alert',
        DIV: '#alertDiv',
        TITLE: '.alert-heading',
        TEXT: 'p',
        ERROR: {
          STYLE: 'alert-danger',
          TITLE: 'Error',
        },
        SUCCESS: {
          STYLE: 'alert-primary',
          TITLE: 'Success!',
        },
        WARNING: {
          STYLE: 'alert-warning',
          TITLE: 'Hmm...',
        },
      },
    },
    DATA: {
      getGalleriesResponse: {
        BASE: 'galleries',
        MAP: [
          'name',
          'nb_media',
          'id',
        ],
      },
      getContentResponse: {
        BASE: 'files',
        MAP: [
          'id',
          'title',
          'width',
          'height',
          'nb_downloads',
          'thumbnail_url',
          'href',
        ],
      },
      TOKEN: 'access_token',
      GALLERY: 'selectedGallery',
      ENV: 'environment',
      POPUP: 'helper',
      COUNT: 'nb_results',
      API_KEY: 'apiKey',
      URL: 'endpoint',
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
  };

  /*
    transforms data from object to array using the mapping constants above
   */
  const prepData = ((data, method) => {
    const d = K.DATA[method];
    return data[d.BASE].map((obj) => d.MAP.map((key) => obj[key]));
  });

  const notify = (message) => {
    // sends message to background
    chrome.runtime.sendMessage(message);
  };

  // gets data from local storage; returns async function
  const retrieve = (key) => new Promise((resolve, reject) => {
    chrome.storage.sync.get(key, (item) => {
      if (chrome.runtime.lastError) {
        const msg = chrome.runtime.lastError.message;
        console.error(msg);
        reject(msg);
      } else {
        resolve(item[key]);
      }
    });
  });

  // gets tab id of active front tab and sends it to background
  const getActiveTabs = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // activeTab.windowId = parent window
      notify({
        status: 'POPUP_READY',
        activeTab: tabs[0],
      });
    });
  };

  // utility to cast array to object
  // https://stackoverflow.com/a/50985915
  const arrayToObj = (keyArr, valueArr) => keyArr.reduce((obj, key, index) => ({
    ...obj,
    [key]: valueArr[index],
  }), {});

  const init = () => {
    // now get front tab id and notify background
    getActiveTabs();
  };

  return {
    K,
    init,
    notify,
    retrieve,
    prepData,
    arrayToObj,
  };
})();

export default Popup;
