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

class Content {
  static CONSTANTS = {
    EVENTS: {
      GALLERY: {
        SET: 'gallery-set',
        RESET: 'gallery-reset',
      },
    },
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
    // key values for local storage
    DATA: {
      TOKEN: 'access_token',
      GALLERY: 'selectedGallery',
      ENV: 'environment',
      POPUP: 'helper',
    },
    UI: {
      THUMB: {
        /* thumb icon parent */
        TARGET_ID: 'div.thumb-frame',
        /* icon grandparent */
        TARGET_PARENT: 'div.search-result-cell',
        /* data element with id */
        CONTENT: 'content-id',
        CLASS: 'gal',
        TITLE: 'Click to add to selected gallery',
      },
      MODAL_PARENT: {
        ID: '.all-content-wrapper',
      },
      STATUS: {
        TARGET_ID: 'div.lib-header-menu',
        CLASS_DEFAULT: 'gallery-banner',
        CLASS_ON: 'gallery-selected',
        TEXT_ID: '#galStatusText',
        MAIN: '#galStatus',
        HTML: '<div id="galStatus" class="gallery-banner"><div class="subheading gallery-status" data-id="">Gallery:&nbsp;<span id="galStatusText">None</span></div></div>',
        STATE: {
          RESET: 0,
          SUCCESS: 1,
        },
      },
    },
  }

  // stores data in local storage
  static store(obj) {
    if (chrome.storage) {
      console.log(obj);
      chrome.storage.sync.set(obj, () => {
        const key = Object.keys(obj)[0];
        chrome.storage.sync.get(key, () => {
          console.log('Storing %s', key);
        });
      });
    }
  }

  // broadcasts messages to chrome runtime
  static notify(message) {
    chrome.runtime.sendMessage(message);
  }

  // gets data and returns promise for chaining
  static retrieve(key) {
    return new Promise((resolve, reject) => {
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
  }

  // check for token value in cookie and extract it
  static getToken() {
    return document.cookie.replace(/(?:(?:^|.*;\s*)c?iat0\s*=\s*([^;]*).*$)|^.*$/, '$1');
  }
}

const {
  notify,
  getToken,
  retrieve,
  CONSTANTS: K,
} = Content;

// session data stored while popup is open
const tempData = {
  gallery: {
    id: '',
    name: 'None',
  },
};

async function doSetup() {
  const token = getToken();
  if (token !== '') {
    console.log('storing access token');
    notify({
      status: 'TOKEN_READY',
      data: token,
    });
  } else {
    console.log('no token found!');
    notify({ status: 'TOKEN_PROBLEM' });
  }
}

async function getCurrentGallery() {
  const { id } = await retrieve(K.DATA.GALLERY);
  if (!id) {
    throw Error('No gallery selected in extension.');
  }
  return id;
}

// listen for incoming messages from extension
chrome.runtime.onMessage.addListener((message) => {
  console.log(message);
  const { status } = message;
  const { data } = message || null;
  switch (status) {
    case 'BACKGROUND_READY':
    case 'POPUP_READY':
      break;
    case K.EVENTS.GALLERY.SET:
      // store gallery name and id
      tempData.gallery = {
        id: data.id,
        name: data.name,
      };
      // notify listener to update banner
      document.dispatchEvent(new Event(status));
      break;
    case K.EVENTS.GALLERY.RESET:
      // unset gallery name
      tempData.gallery = {
        id: '',
        name: 'None',
      };
      document.dispatchEvent(new Event(status));
      break;
    case 'PING': // sends ping back to background
      notify({ status: 'PONG' });
      break;
    default:
      break;
  }
});

doSetup().then(() => {
  notify({ status: 'CONTENT_READY' });
});

const $ = window.jQuery;
$(document).ready(() => {
  console.log('jQuery ready in content');

  // opens modal
  // see https://www.webdesignerdepot.com/2012/10/creating-a-modal-window-with-html5-and-css3/
  const openModal = ((title, message) => {
    const { MODAL_PARENT: WINDOW } = K.UI;
    // html for modal
    const getModalHtml = () => `<div id="galleryHelperModal" class="modalDialog"><div><a href="#" title="Close" class="close">&times;</a><h1>${title}</h1><p>${message}</p></div></div>`;
    // create jquery obj
    const $modal = $(getModalHtml());
    // add close handler
    $(WINDOW.ID).on('click', '.modalDialog', (e) => {
      e.preventDefault();
      $modal.remove();
    });
    $modal.appendTo(WINDOW.ID);
  });

  // handles add event
  const onGalleryAdded = (e) => {
    e.stopPropagation();
    const $clicked = $(e.currentTarget);
    // get current gallery id
    getCurrentGallery()
      .then((id) => {
        notify({
          target: K.TARGET.B,
          data: {
            contentIds: $clicked.data(K.UI.THUMB.CONTENT),
            id,
          },
          action: K.ACTION.ADD,
        });
      }).catch((err) => {
        openModal('Warning', err.message);
      });
  };

  // inserts star icon button on each thumb
  // https://swizec.com/blog/how-to-properly-wait-for-dom-elements-to-show-up-in-modern-browsers/swizec/6663
  const insertThumbUi = () => {
    const {
      CONTENT, CLASS, TARGET_PARENT: PARENT, TARGET_ID: TARGET, TITLE,
    } = K.UI.THUMB;
    // recursively check if element exists
    if (!$(TARGET).length) {
      window.requestAnimationFrame(insertThumbUi);
    } else {
      // insert icon on thumbs and add listener
      const $parent = $(PARENT);
      $parent.append((idx) => {
        const id = $($parent.get(idx)).data(CONTENT);
        const $galBtn = $(document.createElement('div'));
        $galBtn.addClass(CLASS);
        $galBtn.attr('title', TITLE);
        $galBtn.on('click', onGalleryAdded);
        $galBtn.attr(`data-${CONTENT}`, id);
        return $galBtn;
      });
    }
  };

  // adds gallery status banner to Library page
  const insertStatusUi = () => {
    const {
      TARGET_ID: TARGET, HTML,
    } = K.UI.STATUS;
    if (!$(TARGET).length) {
      window.requestAnimationFrame(insertStatusUi);
    } else {
      // insert status element with default text
      $(TARGET).append(HTML);
      // notify background
      notify({ status: 'CONTENT_STATUS_READY' });
    }
  };

  // LISTENERS
  // gallery status event
  const { SET, RESET } = K.EVENTS.GALLERY;
  $(document).on(`${SET} ${RESET}`, (e) => {
    const {
      TEXT_ID: NAME, MAIN: ID, CLASS_ON: ON,
    } = K.UI.STATUS;
    if (e.type === RESET) {
      $(ID).removeClass(ON);
    } else {
      $(ID).addClass(ON);
    }
    // update text and id
    $(NAME).text(tempData.gallery.name);
    $(ID).attr('data-id', tempData.gallery.id);
  });

  // INIT
  insertThumbUi();
  insertStatusUi();
});
