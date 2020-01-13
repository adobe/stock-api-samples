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

// eslint-disable-next-line import/extensions
import Popup from './popup.js';

const $ = window.jQuery;
const {
  notify,
  retrieve,
} = Popup;

$(document).ready(() => {
  const K = {
    EVENTS: {
      OPTIONS: {
        SET: 'options-set',
        RESET: 'options-reset',
      },
    },
    DATA: {
      API_KEY: 'apiKey',
      URL: 'endpoint',
    },
    UI: {
      CLOSE: '#options-close',
    },
  };
  const formData = {
    [K.DATA.API_KEY]: {
      name: K.DATA.API_KEY,
      value: '',
      id: '#apiKeyInput',
    },
    [K.DATA.URL]: {
      name: K.DATA.URL,
      value: '',
      id: '#endpointInput',
    },
  };

  // when dialog is opened, populate with current api key/url values
  const updateUi = (apiKey, url) => {
    const f = formData;
    const data = K.DATA;
    $(f[data.API_KEY].id).val(apiKey);
    $(f[data.URL].id).val(url);
  };

  const getBaseUrl = (url) => {
    const ex = /((https?)?:?(\/\/))?(.*)/.exec(url);
    return (ex && ex.length > 0 && ex[4]) ? ex[4] : url;
  };

  const checkAndSaveData = (formVals) => {
    const retVals = {};
    formVals.forEach((entry) => {
      const { name } = entry;
      let val;
      if (name === K.DATA.URL) {
        const { value } = entry;
        val = `https://${getBaseUrl(value)}`;
      } else {
        const apiKeyTest = /^[a-zA-Z0-9]+$/;
        if (!apiKeyTest.test(entry.value)) {
          throw Error(`${name} has an illegal value.`);
        } else {
          val = entry.value;
        }
      }
      // store data locally
      formData[name].value = val;
      // create response data
      retVals[name] = formData[name].value;
    });
    return retVals;
  };

  // closes options dialog
  const onOptionsClose = (() => window.close());

  // opens toast notification
  const onNotification = (() => {
    $('.toast').toast('show');
  });

  const onFormSubmit = ((e) => {
    e.preventDefault();
    const $form = $(e.currentTarget);
    try {
      // validate data and save locally
      const data = checkAndSaveData($form.serializeArray());
      console.log(data);
      // update in chrome storage
      notify({
        status: K.EVENTS.OPTIONS.SET,
        data,
      });
      // show toast
      onNotification();
      // update UI with formatted values
      updateUi(data[K.DATA.API_KEY], getBaseUrl(data[K.DATA.URL]));
    } catch (err) {
      console.error(err);
    }
  });

  // check if values exist
  Promise.all([
    retrieve(K.DATA.API_KEY),
    retrieve(K.DATA.URL),
  ]).then(([apiKey, url]) => {
    if (apiKey && url) {
      const f = formData;
      const data = K.DATA;
      f[data.API_KEY].value = apiKey;
      f[data.URL].value = url;
      console.log(`retrieving api key and url: ${apiKey} ${url}`);
      updateUi(apiKey, getBaseUrl(url));
    } else {
      console.log('api key and url not set in storage');
    }
  });

  $('form').on('submit', onFormSubmit);
  $(K.UI.CLOSE).on('click', onOptionsClose);
});
