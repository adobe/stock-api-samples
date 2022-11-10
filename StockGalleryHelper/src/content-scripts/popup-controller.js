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
  K,
  init,
  notify,
  retrieve,
  prepData,
  arrayToObj,
} = Popup;

$(document).ready(() => {
  // stores environment
  let Env;

  // clone dynamic content
  const $galleryForm = $(K.UI.GALLERY.FORM.ID).clone();
  const $importForm = $(K.UI.CONTENTS.FORM.ID).clone();

  // VIEW
  // -------------
  // show/hide loader
  const toggleLoader = (show) => {
    const $loader = $(K.UI.WAIT).clone();
    if (show) {
      $(K.UI.MODAL.TITLE).text('Loading data...');
      $(K.UI.MODAL.BODY).append($loader);
      // opens modal
      $(K.UI.MODAL.ID).modal('show');
      $(K.UI.MODAL.ID).modal('handleUpdate');
    } else {
      setTimeout(() => {
        $(K.UI.MODAL.BODY).remove($loader);
        $(K.UI.MODAL.ID).modal('hide');
      }, 1000);
    }
  };

  // show error notification
  const showAlert = ((msg, type) => {
    const { ALERT } = K.UI;
    const $alert = $(ALERT.ID).clone();
    // set color style ('primary' or 'danger')
    $alert.removeClass(`${ALERT.SUCCESS.STYLE} ${ALERT.ERROR.STYLE}`);
    $alert.addClass(type.STYLE);
    // set title ('error' or 'success')
    $alert.find(ALERT.TITLE).text(type.TITLE);
    $alert.find(ALERT.TEXT).text(msg);
    // $alert.alert();
    setTimeout(() => {
      $alert.alert('close');
    }, 8000);
    $(ALERT.DIV).append($alert);
  });

  // clear modal
  const emptyModal = (() => {
    $(K.UI.MODAL.BODY).children().detach();
  });

  // toggle banner state and text
  const setStatus = ((state,
    id = K.UI.STATUS.ID.DEFAULT,
    name = K.UI.STATUS.NAME.DEFAULT,
    count = K.UI.STATUS.COUNT.DEFAULT) => {
    const {
      BANNER, BG, ID, NAME, COUNT,
    } = K.UI.STATUS;
    // update text and ID
    $(NAME.ID).text(name);
    $(COUNT.ID).text(count);
    $(ID.ID).attr('data-id', id);
    // set ui state
    const styleState = `STYLE_${state}`;
    [BANNER, BG, NAME, COUNT].forEach((ui) => {
      $(ui.ID).removeClass(`${ui.STYLE_SUCCESS} ${ui.STYLE_RESET}`);
      $(ui.ID).addClass(`${ui[styleState]}`);
    });
    console.log(`Status set to STATE_${state}`);
  });

  // HANDLERS
  // -------------

  // shows error if options are not configured
  const onOptionsNotSet = () => {
    const msg = 'You must set a valid API key and Gallery endpoint URL to use this extension. When these values are set, reload or refresh this extension.';
    showAlert(msg, K.UI.ALERT.ERROR);
    chrome.runtime.openOptionsPage();
  };

  // checks if endpoint/api key are NOT defined in options and throws error or runs next function
  const checkOptionsNotSet = async (successFunc) => {
    const apiKey = retrieve(K.DATA.API_KEY);
    const endpoint = retrieve(K.DATA.URL);
    const [a, e] = await Promise.all([
      apiKey,
      endpoint,
    ]);
    if (!(a && e)) {
      onOptionsNotSet();
    } else {
      successFunc();
    }
  };

  // new gallery form handler
  const onGalleryFormSubmit = (e) => {
    // override submit behavior
    e.preventDefault();
    // get escaped data and clear form
    const name = $galleryForm.serializeArray()[0].value;
    $galleryForm[0].reset();
    console.log(`creating new gallery '${name}'`);
    // remove form
    emptyModal();
    // show loader
    toggleLoader(true);
    // send request
    notify({
      action: K.ACTION.NEW,
      data: name,
    });
  };

  // get confirmation
  const onApprovalNeeded = (ui, onConfirm, args = []) => {
    emptyModal();
    // remove any pesky bindings
    $(K.UI.MODAL.ID).off('hidden.bs.modal');
    const $consentForm = $(K.UI.CONSENT.ID).clone();
    $consentForm.find(K.UI.CONSENT.MSG).html(ui.msg);
    $(K.UI.MODAL.TITLE).text(ui.title);
    $(K.UI.MODAL.COLOR).addClass(ui.color);
    $(K.UI.MODAL.BODY).append($consentForm);
    // opens modal after adding click handler
    $(K.UI.MODAL.ID).on('shown.bs.modal', () => $consentForm.on('submit', ((e) => {
      e.preventDefault();
      // remove form
      emptyModal();
      // show loader
      toggleLoader(true);
      onConfirm(...args);
    }))).modal('show');
  };

  // import gallery form handler
  const onImportFormSubmit = (e) => {
    // override submit behavior
    e.preventDefault();
    // get form data and empty modal
    const data = {
      id: $(K.UI.CONTENTS.FORM.TARGET).val(),
      importId: $(K.UI.CONTENTS.FORM.SOURCE).val(),
    };
    $importForm[0].reset();
    emptyModal();
    // closes modal before re-opening--only fires one time
    $(K.UI.MODAL.ID).one('hidden.bs.modal', () => {
      // get confirmation
      const ui = {
        msg: `Please confirm you want to import contents from ID&nbsp;<mark>${data.importId}</mark> to ID&nbsp;<mark>${data.id}</mark>. <br>This cannot be undone.`,
        title: 'Are you sure?',
        color: 'bg-warning',
      };
      onApprovalNeeded(ui, () => {
        console.log('importing gallery...');
        // send request
        notify({
          action: K.ACTION.IMP,
          data,
        });
      });
    }).modal('hide');
  };

  // delete gallery handler
  const onDeleteRow = (data) => {
    // get confirmation
    const ui = {
      msg: `Please confirm you want to delete gallery "<mark>${data.name}</mark>" with id ${data.id}. This cannot be undone.`,
      title: 'Are you sure?',
      color: 'bg-warning',
    };
    onApprovalNeeded(ui, () => {
      console.log('deleting gallery...');
      // TODO: notify content tab
      // send request
      notify({
        action: K.ACTION.DEL,
        data: data.id,
      });
    });
  };

  // delete content handler
  const onDeleteContent = (data) => {
    // get confirmation
    const ui = {
      msg: `<h6><img src="${data.thumbnail_url}" class="img-fluid img-thumbnail float-sm-right">Please confirm you want to remove asset <mark>${data.id}</mark>, ${data.title}</h6>`,
      title: 'Confirm removal',
      color: 'bg-warning',
    };
    // extract gallery guid
    const galleryId = null || data.href.match(/\/(\w+)\/\d+$/)[1];
    onApprovalNeeded(ui, () => {
      console.log('deleting content...');
      // send request
      notify({
        action: K.ACTION.REM,
        data: {
          contentId: data.id,
          id: galleryId,
        },
      });
    });
  };

  // delete ALL gallery content handler
  const onDeleteAllContent = () => {
    // get current gallery ID
    retrieve(K.DATA.GALLERY).then(({ id, name }) => {
      if (!id) {
        const warning = 'No gallery selected';
        console.warn(warning);
        showAlert(warning, K.UI.ALERT.WARNING);
      } else {
        // cast data as object
        const row = { id, name };
        // now call refresh
        console.log(row);
        // confirmation ui
        const ui = {
          msg: `Please confirm you want to delete ALL contents from gallery "<mark>${row.name}</mark>" with id <mark>${row.id}</mark>. This cannot be undone.`,
          title: 'Are you sure?',
          color: 'bg-warning',
        };
        onApprovalNeeded(ui, () => {
          console.log('deleting gallery contents...');
          // send request
          notify({
            action: K.ACTION.FIX,
            data: {
              id: row.id,
              name: row.name,
              count: row.nb_media,
            },
          });
        });    
      }
    });      
  };

  // handles refresh of gallery content
  // could be triggered by button or link click
  // STK-63032: Also sends total count as workaround
  // { name: "Fall Leaves", nb_media: 440, id: "1QdJ0awtLWxEwyrTC7OTmrEfyzsWt3Rk" }
  const refreshContents = ((row) => {
    emptyModal();
    toggleLoader(true);
    return notify({
      action: K.ACTION.DIR,
      data: {
        id: row.id,
        name: row.name,
        count: row.nb_media, // STK-63032 inserted
      },
    });
  });

  // handles click of button and fetches data needed
  const onContentRefreshClick = (() => {
    retrieve(K.DATA.GALLERY).then(({ id, name }) => {
      if (!id) {
        const warning = 'No gallery selected';
        console.warn(warning);
        showAlert(warning, K.UI.ALERT.WARNING);
      } else {
        // cast data as object
        const row = { id, name };
        // now call refresh
        console.log(row);
        refreshContents(row);
      }
    });
  });

  const onGalleryRefresh = () => {
    retrieve(K.DATA.ENV).then((data) => {
      Env = data;
      console.log(`updating environment to ${data}`);
      emptyModal();
      toggleLoader(true);
      // reset gallery selection and notify background
      setStatus(K.UI.STATUS.STATE.RESET);
      notify({ status: K.EVENTS.GALLERY.RESET });
      notify({ action: K.ACTION.GET });
    });
  };

  // LISTENERS
  // -------------
  // gallery form submission
  $galleryForm.on('submit', onGalleryFormSubmit);

  // import gallery id submit
  $importForm.on('submit', onImportFormSubmit);

  // refresh table size when tab is viewed
  $('a[data-toggle="tab"]').on('shown.bs.tab', () => {
    $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
  });

  // gallery refresh button: only works if options are set
  $(K.UI.GALLERY.REFRESH).on('click', (() => checkOptionsNotSet(onGalleryRefresh)));

  // listen for click on gallery contents row using delegate
  /*
  $(K.UI.GALLERY.LINK.DEL).on('click', K.UI.GALLERY.LINK.TARG, (e) => {
    e.preventDefault();
    console.log(console.log(e.currentTarget));
    // switch to View tab
    onContentsRefresh();
  });
  */

  // content list refresh button
  $(K.UI.CONTENTS.REFRESH).on('click', onContentRefreshClick);

  // empty modal when closed
  $(K.UI.MODAL.ID).on('hidden.bs.modal', () => {
    emptyModal();
  });

  // common table options
  // see https://datatables.net/manual/
  const dtConfig = {
    // scrollY: '95vh',
    // scrollCollapse: true,
    deferRender: true,
    // scroller: true,
    fixedHeader: true,
    autoWidth: false,
    responsive: true,
    paging: true,
    pageLength: 50,
    lengthMenu: [[25, 50, 100, -1], [25, 50, 100, 'All']],
    select: {
      style: 'single',
      className: 'rowSelect',
    },
    dom: 'lBfrtip', // makes buttons visible
  };

  // content table
  const $ct = $(K.UI.CONTENTS.TABLE.ID).DataTable({
    ...dtConfig,
    // input data is plain array
    columnDefs: [
      {
        name: 'thumb',
        targets: [0],
        data: 5,
        render: ((url) => `<img class="table-thumb" src="${url}">`),
      },
      {
        // name when referencing the data
        name: 'id',
        targets: [1],
        data: 0,
        render: ((id) => `<a class="bg-white" href="${K.STOCK_URL[Env]}${id}" target="_blank" title="Open in new tab">${id}</a>`),
      },
      {
        name: 'title',
        targets: [2],
        data: 1,
        // https://datatables.net/blog/2016-02-26
        render: (data) => ((data && data.length > 20) ? `${data.substr(0, 20)}…` : data),
      },
      {
        // combines columns 2 and 3 (width/height)
        name: 'size',
        data: 2,
        targets: [3],
        render: ((...[width, , row]) => {
          const height = row[3];
          return `${width}&nbsp;x&nbsp;${height}`;
        }),
      },
      {
        name: 'downloads',
        targets: [4],
        // column 3 (height) is skipped
        data: 4,
        type: 'num',
      },
      {
        // hide href column
        name: 'href',
        data: 7,
        visible: false,
      },
    ],
    // adds custom buttons to data tables
    buttons: [
      // deletes item
      {
        // connects to 'select' API
        extend: 'selected',
        text: 'Remove',
        action: (_e, ct) => {
          const row = ct.rows({ selected: true }).data()[0];
          // cast row array to object
          const data = arrayToObj(K.DATA.getContentResponse.MAP, row);
          console.log('selected', data);
          onDeleteContent(data);
        },
      },
      // exports data as CSV
      {
        extend: 'csv',
        text: 'Export CSV',
        filename: 'Adobe_Stock_Gallery_Content',
      },
      // deletes "all" items in gallery -- for syncing issues
      {
        text: 'Delete ALL content',
        action: () => {
          onDeleteAllContent();
        },
      },
    ],
    language: {
      emptyTable: 'Selected gallery is empty.',
    },
  });

  // initialize gallery table
  const $gt = $(K.UI.GALLERY.TABLE.ID).DataTable({
    ...dtConfig,
    columns: [
      {
        name: 'name',
      },
      { name: 'nb_media', type: 'num' },
      {
        name: 'id',
        // render as hyperlink
        render: ((id) => `<a class="bg-white" rel="next" href="${K.STOCK_URL[Env]}collections/${id}" target="_blank" title="View gallery on Stock">${id}</a>`),
      },
    ],
    buttons: [
      {
        // adds new gallery
        text: 'Add',
        action: () => {
          emptyModal();
          // inserts form content in modal
          $(K.UI.MODAL.TITLE).text('Create a new gallery');
          $(K.UI.MODAL.BODY).append($galleryForm);
          // opens modal
          $(K.UI.MODAL.ID).modal('show');
        },
      },
      {
        // deletes existing gallery
        extend: 'selected',
        text: 'Delete',
        action: (e, gt) => {
          const row = gt.rows({ selected: true }).data()[0];
          // cast row array to object
          const data = arrayToObj(K.DATA.getGalleriesResponse.MAP, row);
          console.log('selected', data);
          onDeleteRow(data);
        },
      },
      {
        // custom button to import existing gallery ID
        // https://datatables.net/extensions/buttons/custom
        extend: 'csv',
        text: 'Export CSV',
        filename: 'Adobe_Stock_Gallery_List',
      },
      {
        extend: 'selected',
        text: 'Import Gallery ID',
        action: (e, gt) => {
          emptyModal();
          const row = gt.rows({ selected: true }).data()[0];
          const data = arrayToObj(K.DATA.getGalleriesResponse.MAP, row);
          console.log('selected', data);
          // inserts form content in modal
          $(K.UI.MODAL.TITLE).text('Import gallery contents');
          $(K.UI.MODAL.BODY).append($importForm);
          // inserts text of selected gallery
          $(K.UI.CONTENTS.FORM.TARGET_NAME).val(data.name);
          $(K.UI.CONTENTS.FORM.TARGET).val(data.id);
          // opens modal
          $(K.UI.MODAL.ID).modal('show');
        },
      },
    ],
  });

  // listen for selection events
  $gt.on('select', (e, dt, type, indexes) => {
    if (type === 'row') {
      const row = dt.rows().data()[indexes];
      const data = arrayToObj(K.DATA.getGalleriesResponse.MAP, row);
      console.log('selected', data);
      // update UI with selected gallery
      refreshContents(data);
    }
  });

  // listen for deselect events
  $gt.on('deselect', () => {
    setStatus(K.UI.STATUS.STATE.RESET);
    // refresh gallery list
    notify({ status: K.EVENTS.GALLERY.RESET });
  });

  // listen for messages from content and popup script
  // second argument is `sender` tab
  chrome.runtime.onMessage.addListener((message) => {
    console.log(message);
    // message is targeted to popup
    if (message.target && message.target === K.TARGET.P) {
      const { data, status } = message;
      const {
        GET, NEW, DEL, DIR, ADD, REM, FIX, ERROR, IMP,
      } = K.RESPONSE;
      let msg;
      switch (status) {
        case GET:
          // convert data to table array
          $gt.clear().rows.add(prepData(data, status)).draw();
          // dismiss modal if present
          toggleLoader(false);
          break;
        case NEW: {
          // dismiss modal
          toggleLoader(false);
          const { title } = (data.gallery && data.gallery.title) ? data.gallery : { title: 'unknown' };
          showAlert(`New gallery ${title} created.`, K.UI.ALERT.SUCCESS);
          // show success message and refresh
          setTimeout(() => {
            toggleLoader(true);
            notify({ action: K.ACTION.GET });
          }, 1500);
          break;
        }
        case DEL: // Gallery deleted
          $gt.rows().deselect();
          setStatus(K.UI.STATUS.STATE.RESET);
          // refresh gallery list
          checkOptionsNotSet(onGalleryRefresh);
          break;
        case DIR: { // Gallery directory/listing
          // reverse data order
          if (data.files) {
            data.files.reverse();
          }
          $ct.clear()
            .rows.add(prepData(data, status))
            .draw()
            .columns.adjust();
          // get current gallery and update ui
          const count = data[K.DATA.COUNT] || 0;
          retrieve(K.DATA.GALLERY).then(({ id, name }) => {
            setStatus(K.UI.STATUS.STATE.SUCCESS, id, name, count);
            // update status banner on Stock site (content script)
            notify({
              target: K.TARGET.C,
              status: K.UI.STATUS.STATE.SUCCESS,
              data: { id, name, count },
            });
          });
          toggleLoader(false);
          break;
        }
        case ADD: {
          const { files } = data;
          if (files.length) {
            msg = `Image #${data.files[0].id} added.`;
          } else {
            msg = 'Image already in gallery.';
          }
          showAlert(msg, K.UI.ALERT.SUCCESS);
          break;
        }
        case REM: // Content removed
          $ct.rows().deselect();
          onContentRefreshClick();
          break;
        case IMP: // Gallery imported
          // dismiss modal
          toggleLoader(false);
          if (data) {
            msg = `${data} images imported.`;
          } else {
            msg = 'Nothing imported.';
          }
          showAlert(msg, K.UI.ALERT.SUCCESS);
          break;
        case FIX: // removed all gallery content
          // dismiss modal
          toggleLoader(false);
          // TODO: Process warning message if gallery already empty
          // TODO: Return empty contents and update table--can this be done from Background?
          if (data) {
            msg = data;
          } else {
            msg = 'Failed.';
          }
          showAlert(msg, K.UI.ALERT.SUCCESS);
          break;
        case ERROR:
          // dismiss modal
          toggleLoader(false);
          // show error
          showAlert(message.data, K.UI.ALERT.ERROR);
          break;
        default:
          console.log('other:', status, data);
          break;
      }
    }
  });

  // if api key and endpoint are populated, refresh gallery contents
  checkOptionsNotSet(onGalleryRefresh);
  init();
});
