class CONSTANTS {
  static CONSTANTS = {
    EVENTS: {
      // updates the gallery banner display
      GALLERY: {
        SET: 'gallery-set',
        RESET: 'gallery-reset',
      },
      // updates ui button overlay and banner
      LIBRARY: {
        REFRESH: 'refresh',
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
        FORM: {
          ID: '#importGalleryForm',
          // gallery ID to be imported
          SOURCE: '#importGalleryId',
          // selected gallery id and name
          TARGET: '#selectedGalleryId',
          TARGET_NAME: '#selectedGalleryName',
        },
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
    },
    ACTION: {
      GET: 'getGalleries',
      NEW: 'createGallery',
      DEL: 'deleteGallery',
      DIR: 'getContent',
      ADD: 'addContent',
      REM: 'removeContent',
      IMP: 'importContent',
    },
    RESPONSE: {
      GET: 'getGalleriesResponse',
      NEW: 'createGalleryResponse',
      DEL: 'deleteGalleryResponse',
      DIR: 'getContentResponse',
      ADD: 'addContentResponse',
      REM: 'removeContentResponse',
      IMP: 'importContentResponse',
      ERROR: 'Error',
    },
    // determines which environment extension is running by reading URL from config options
    ENV: {
      PROD: ['stock.adobe', 'contributor.stock.adobe'],
      STAGE: ['primary.stock.stage.adobe', 'staging1.contributors.adobestock', 'sandbox.stock.stage.adobe'],
      DEV: ['adobestock.dev', 'contributors.dev'],
    },
    // key values for local storage
    DATA: {
      /**
       * The response models map generic HTTP requests to specific JSON objects from Stock
       * BASE: JSON root element to be parsed
       * COUNT: Name of JSON element containing number of elements
       * MAP: Specific elements to retrieve from each JSON array item
       * LIMIT: Max number of results to fetch with each request
       */
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
      importContentResponse: {
        BASE: 'files',
        COUNT: 'nb_results',
        MAP: ['id'],
        LIMIT: 100, // api request limit
      },
      TOKEN: 'access_token',
      GALLERY: 'selectedGallery',
      URL: 'endpoint',
      API_KEY: 'apiKey',
      ENV: 'environment',
      POPUP: 'helper',
    COUNT: 'nb_results',
    API_KEY: 'apiKey',
    URL: 'endpoint',
    },
  }
}
