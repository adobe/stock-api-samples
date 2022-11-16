/* eslint-disable no-console */
(() => {
  let stockThumbsConfig = {};
  let stockThumbsMain = null;
  let jqLoaded;
  // expose global object
  window.StockThumbs = {
    init: (config) => {
      stockThumbsConfig = config;
      // rules for app to use alternate options
      stockThumbsConfig.custom = config.custom;
      window.addEventListener('jQueryLoaded', (e) => {
        // prevents a double event
        const loadScripts = jqLoaded(stockThumbsConfig);
        e.target.removeEventListener('jQueryLoaded', loadScripts, false);
      }, { once: true, passive: true });
      window.addEventListener('StockThumbsReady', () => {
        console.log('StockThumbs ready');
        const stm = stockThumbsMain();
        const { StockThumbs } = window;
        // merge custom config rules with global config
        if (StockThumbs.config && StockThumbs.config.custom) {
          stockThumbsConfig.custom = Object.assign(config.custom, StockThumbs.config.custom);
          // initialize custom code with config and main object
          if (StockThumbs.config.custom.init) {
            StockThumbs.config.custom.init(stockThumbsConfig, stm);
          }
        }
        // expose to global object
        StockThumbs.getFilters = stm.getFilters;
        StockThumbs.setFilters = stm.setFilters;
        StockThumbs.config = stockThumbsConfig;
        // now call main init method returned below
        stm.init();
        // modern browser method to remove event handler when done
      }, { once: true, passive: true });
    },
  };
  stockThumbsMain = () => {
    const { AdobeStock } = window;
    const stc = stockThumbsConfig;
    // utility functions for getting tracking urls and paths
    const utils = {
      includePath: window.StockThumbs.PATH,
      // adobe.prf.hn/click/camref:(CamRef)/pubref:(PubRef)/destination:(URL)
      getTrackingUrl: (url, cfg) => `//adobe.prf.hn/click/${cfg.camRef}:/pubref:${encodeURIComponent(cfg.pubRef)}/destination:${encodeURIComponent(url)}`,
      getHost: () => {
        let host = document.location.hostname;
        // check if a custom hostname is set
        if (stc.custom && stc.custom.hostname) {
          host = stc.custom.hostname;
        } else {
          // if <base href> is set, return that instead of doc location
          const base = document.querySelector('base') && document.querySelector('base').href;
          // create temporary link and extract hostname
          const tmpLink = document.createElement('a');
          tmpLink.href = base;
          host = tmpLink.hostname;
        }
        return host;
      },
      get stockHomeUrl() {
        return this.getTrackingUrl(`https://stock.adobe.com?as_campaign=${encodeURIComponent(this.getHost())}`, stc);
      },
    };
    // returns cta link per ctaLink config variable
    const getCtaText = () => {
      const fmfUrl = utils.getTrackingUrl(`https://stock.adobe.com/promo/firstmonthfree?as_campaign=${utils.getHost()}`, stc);
      const videoUrl = utils.getTrackingUrl(`https://stock.adobe.com/video?as_campaign=${utils.getHost()}`, stc);
      const cta = {
        fmf: `<p>First month free with <a href="${fmfUrl}" class="astock-searchbar-link" target="_blank">Adobe Stock annual plans</a>.</p>`,
        video: `<p>Save money on Adobe Stock videos <a href="${videoUrl}" class="astock-searchbar-link" target="_blank">with a credit pack</a>.</p>`,
      };
      if (stc.ctaLink === 'video') return cta.video;
      return cta.fmf;
    };
    const sbHeader = `<div class="astock-searchbar-header"><a href="${utils.stockHomeUrl}" target="_blank"><img src="${utils.includePath}/stock_2020_dark_400.png"></a>${getCtaText()}</div>`;

    function parseFilters(filters) {
      const searchFilters = {};
      const { $jq } = window.StockThumbs;
      if (!filters) return searchFilters;
      // iterate over object using method that won't bother eslint!
      const filterMap = Object.entries(filters);
      const stkParams = AdobeStock.SEARCH_PARAMS;
      // lookup Stock keyname and map to search filter name
      filterMap.forEach(([key, currentValue]) => {
        let value = currentValue;
        if (Object.prototype.hasOwnProperty.call(stkParams, key)) {
          if (key === 'SIMILAR_URL') {
            if (value !== '' && value !== undefined) {
              const firstImg = $jq(`${value} img`)[0] || $jq(`${value}`)[0];
              const getSrcSet = (srcset) => ((srcset) ? srcset.split(', ')[0].split(' ')[0] : undefined);
              const url = $jq(firstImg).attr('src') || getSrcSet($jq(firstImg).attr('srcset'));
              if (url !== '' && url !== undefined) {
                searchFilters[stkParams[key]] = url;
              }
            }
          } else if (key === 'WORDS') {
            // value should be array ['DOM element', keyword count]
            if (value && value[0]) {
              const $el = $jq(value[0]);
              const isInput = $el.is('input');
              const phrase = (isInput) ? $el.val() : $el.text();
              // if element has text get keywords
              if (phrase) {
                const keywords = window.StockThumbs.keywordx.extract(phrase, {
                  language: 'english',
                  remove_digits: true,
                  return_changed_case: true,
                  remove_duplicates: true,
                });
                // if count is not supplied default to 1
                const keywordCount = (value[1]) ? value[1] : 1;
                const searchWords = (keywords.length > 0) ? keywords.slice(0, keywordCount).join(' ') : '';
                console.log('keywords: %o\nsearching on %s', keywords, searchWords);
                searchFilters[stkParams[key]] = searchWords;
              }
            }
          } else if (value !== '' && value !== undefined) {
            // validate size
            if (key === 'THUMBNAIL_SIZE') {
              const sizes = [110, 160, 220, 240, 500, 1000];
              const targetSize = value;
              // check if size is in array of allowed sizes
              if (sizes.indexOf(targetSize) < 0) {
                value = sizes.reduce((a, b) => {
                  const newSize = (Math.abs(a - targetSize) < Math.abs(b - targetSize) ? a : b);
                  return newSize;
                });
                console.warn('Thumbnail size of %s is not valid. Closest size is %s', targetSize, value);
              }
            }
            searchFilters[stkParams[key]] = value;
          }
        }
      });
      return searchFilters;
    }

    // returns container div from selector and adds main class
    function $getContDiv(el) {
      const mainClass = 'astock-searchbar';
      const dataId = 'searchbar';
      // get reference to jQuery
      const { $jq } = window.StockThumbs;
      // get reference to target div and data node (might be same)
      let $tempDiv = $jq(el);
      const $dataDiv = $tempDiv.find(`[data-id=${dataId}]`);
      // if data node exists, return it
      if ($dataDiv.length > 0) {
        $tempDiv = $dataDiv;
      // does target node exist
      } else if ($tempDiv.length > 0) {
        // does target node contain main class
        if (!$tempDiv.hasClass(mainClass)) {
          // create new div to be container
          const $mainDiv = $jq(document.createElement('div'));
          // add main class
          $mainDiv.addClass(mainClass);
          // add new container under target and return that
          $tempDiv = $mainDiv;
          $jq(el).append($tempDiv);
        }
        // add data node
        $tempDiv.attr('data-id', dataId);
      // neither exists, throw exception
      } else {
        throw (new Error('StockThumbs error: Container does not exist. Set "parentId" to a valid selector.'));
      }
      return $tempDiv;
    }

    // creates thumbs and inserts -- input is json array
    function updateUiThumbs(...files) {
      if (files.length > 0) {
        const wrapClass = 'astock-searchbar-wrap';
        const bodyClass = 'astock-searchbar-body';
        let itemClass = 'astock-searchbar-item';
        const tipClass = 'astock-searchbar-tip';
        const iconClass = 'astock-searchbar-item-icon';
        // get reference to result columns object
        const columns = AdobeStock.RESULT_COLUMNS;
        // get reference to jQuery
        const { $jq } = window.StockThumbs;
        const $sb = $getContDiv(stc.parentId);
        // wrap thumbnails in container to allow scrolling
        const $wrapDiv = $jq(document.createElement('div'));
        $wrapDiv.addClass(wrapClass);
        const $thumbsDiv = $jq(document.createElement('div'));
        $thumbsDiv.addClass(bodyClass);
        // if body width is less than 150px, apply small item size
        if ($sb.width() <= 150) {
          itemClass = `${itemClass} item-small`;
        }
        // svg video icon
        const videoSvg = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 19 12" style="enable-background:new 0 0 19 12; width:19px; height:10px; fill:white;" xml:space="preserve"><g><path d="M17.8,0.8L13,3V0.8C13,0.4,12.6,0,12.2,0H0.8C0.4,0,0,0.4,0,0.8v10.4C0,11.6,0.4,12,0.8,12h11.4c0.4,0,0.8-0.4,0.8-0.8V 9l4.8,2.2c0.5,0.4,1.2,0,1.2-0.7v-9C19,0.9,18.3,0.5,17.8,0.8z"></path></g></svg>';
        // populate with images using html returned in json
        files.forEach((asset) => {
          // get url to details page on Stock and wrap inside affiliate tracking url
          const url = utils.getTrackingUrl(asset[columns.DETAILS_URL], stc);
          // create div wrapper
          const div = document.createElement('div');
          div.className = itemClass;
          // create anchor with link to details
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          let thumb;
          const videoHandler = (e) => {
            const { target, type } = e;
            if (type === 'mouseover') {
              target.muted = true;
              target.play();
            } else if (type === 'mouseout') {
              target.pause();
            }
          };
          // construct a different thumb element depending on asset type
          if (stc.videoSupport && asset[columns.MEDIA_TYPE_ID] === 4) {
            // create video and source tag
            const video = document.createElement('video');
            const source = document.createElement('source');
            Object.assign(video, {
              preload: 'none',
              poster: asset[columns.THUMBNAIL_URL],
              loop: 'loop',
            });
            // for some reason, cannot assign these properties
            video.setAttribute('muted', 'muted');
            // video.setAttribute('onmouseover', 'videoHandler()');
            // video.setAttribute('onmouseout', 'videoHandler');
            video.addEventListener('mouseover', videoHandler, false);
            video.addEventListener('mouseout', videoHandler, false);
            Object.assign(source, {
              src: asset[columns.VIDEO_SMALL_PREVIEW_URL],
              type: asset[columns.VIDEO_SMALL_PREVIEW_CONTENT_TYPE],
            });
            // add video source and set thumb as video
            video.appendChild(source);
            // add play icon
            const iconDiv = document.createElement('div');
            iconDiv.className = iconClass;
            const svg = document.createRange().createContextualFragment(videoSvg);
            iconDiv.appendChild(svg);
            div.appendChild(iconDiv);
            link.appendChild(video);
            // get html tag
            const tag = asset[columns.THUMBNAIL_HTML_TAG];
            // convert html string into dom element
            thumb = document.createRange().createContextualFragment(tag);
          } else {
            // get html tag
            const tag = asset[columns.THUMBNAIL_HTML_TAG];
            // convert html string into dom element
            thumb = document.createRange().createContextualFragment(tag);
          }
          // if captions are enabled
          if (stc.tooltips) {
            // create tool tip from image title
            const tip = document.createElement('div');
            tip.className = tipClass;
            // get title text from document-fragment
            const tipText = thumb.querySelector('img').title;
            if (tipText !== '' && tipText !== undefined) {
              tip.textContent = tipText;
              thumb.querySelector('img').removeAttribute('title');
              link.appendChild(tip);
              // create hover behavior for tip
              const $tip = $jq(tip);
              const $link = $jq(link);
              const showTip = (el) => {
                el.stopPropagation();
                el.preventDefault();
                const $img = $jq(el.currentTarget);
                const $off1 = $img.offset();
                const $off2 = $sb.offset();
                const newPos = {
                  top: ($off1.top - $off2.top) + $img.height(),
                  left: ($off1.left - $off2.left) + $img.width(),
                };
                $tip.css({
                  top: newPos.top,
                  left: newPos.left,
                });
                // console.log('final pos', newPos);
                $tip.show();
                // change parent to main div
                $sb.append($tip);
              };
              const hideTip = (el) => {
                $tip.css($jq(el.currentTarget).offset());
                $tip.hide();
                // reset parent to link
                $link.append($tip);
              };
              // $jq(thumb.querySelector('img')).hover(showTip);
              $jq(link).hover(showTip, hideTip);
            }
          }
          // wrap link around image/video and add to document
          link.appendChild(thumb);
          div.insertBefore(link, div.lastChild);
          $thumbsDiv.append(div);
        });
        $wrapDiv.append($thumbsDiv);
        $sb.append($wrapDiv);
        // init Masonry
        $thumbsDiv.masonry({
          itemSelector: `.${itemClass}`,
        });
        // listen for images loaded event
        $thumbsDiv.imagesLoaded()
          .progress(() => {
            $thumbsDiv.masonry('layout');
          })
          .done(() => {
            console.log('all images successfully loaded');
            // show search bar
            $sb.addClass('astock-searchbar-fadein');
            // make sure it is visible in case class is missing
            window.setTimeout(() => {
              $sb.css({
                visibility: 'visible',
                opacity: 1,
              });
              // call Masonry layout one final time for Firefox!
              $thumbsDiv.masonry('layout');
            }, 1000);
          });
      } else {
        console.warn('No images to render.');
      }
    }

    // runs search using sdk and returns results
    async function doSearch(params) {
      // default filters
      const defaultParams = {
        offset: 0,
        limit: 16,
      };
      // merge default filters with params from config
      const searchParams = Object.assign(defaultParams, params);
      console.log('Search query: %o', searchParams);
      const queryParams = {
        // if locale is set in config, use that instead of default
        locale: ((stc.locale) ? stc.locale : 'en-US'),
        search_parameters: searchParams,
      };
      // result fields to get back
      // if result_columns exists in config, use that instead
      let resultColumns = [];
      const hasCustomColumns = Boolean(stc.custom && stc.custom.result_columns);
      if (!hasCustomColumns) {
        const imageColumns = [
          AdobeStock.RESULT_COLUMNS.THUMBNAIL_HTML_TAG,
          AdobeStock.RESULT_COLUMNS.DETAILS_URL,
          AdobeStock.RESULT_COLUMNS.NB_RESULTS,
        ];
        const videoColumns = [
          AdobeStock.RESULT_COLUMNS.TITLE,
          AdobeStock.RESULT_COLUMNS.THUMBNAIL_URL,
          AdobeStock.RESULT_COLUMNS.MEDIA_TYPE_ID,
          AdobeStock.RESULT_COLUMNS.VIDEO_SMALL_PREVIEW_URL,
          AdobeStock.RESULT_COLUMNS.VIDEO_SMALL_PREVIEW_CONTENT_TYPE,
        ];
        // if video support is enabled, include extra result columns
        resultColumns = (stc.videoSupport) ? imageColumns.concat(videoColumns) : imageColumns;
      } else {
        const tempFields = stc.custom.result_columns;
        // fully qualify result column names
        const stkResults = AdobeStock.RESULT_COLUMNS;
        tempFields.forEach((field) => {
          resultColumns.push(stkResults[field]);
        });
        resultColumns.push(AdobeStock.RESULT_COLUMNS.NB_RESULTS);
        console.log(resultColumns);
      }
      // create sdk instance
      const stock = new AdobeStock(stc.apiKey, stc.appName, AdobeStock.ENVIRONMENT.PROD);
      // execute search and load results
      const iterator = stock.searchFiles(null, queryParams, resultColumns);
      // iterate over returned Promise
      return iterator.next().then(() => {
        let files;
        const response = iterator.getResponse();
        if (response.nb_results > 0) {
          ({ files } = response);
        } else {
          console.log('no results from Stock');
        }
        return files;
      }).catch((err) => {
        console.log(err);
        return false;
      });
    }
    // expose methods and objects outside Main object
    return {
      init: async () => {
        // get reference to loaded jQuery
        const { $jq } = window.StockThumbs;
        // extract search options and run search
        const result = await doSearch(parseFilters(stc.filters));
        // runs callback after search results are returned (optional)
        if (stc.callback && (typeof stc.callback === 'function')) {
          stc.callback.apply(this, result);
        }
        // if custom code is present, return search results and run code instead of default behavior
        if (stc.custom && stc.custom.exec) {
          // call custom code main entry point
          stc.custom.exec.call(this, result);
        } else {
          try {
            // create search results
            const $stockThumbs = $getContDiv(stc.parentId);
            // create stock header
            const $header = $jq(sbHeader);
            $stockThumbs.append($header);
            updateUiThumbs.apply(this, result);
          } catch (error) {
            console.warn('Unable to initialize StockThumbs.');
          }
        }
      },
      // expose search filters for troubleshooting
      getFilters: () => { console.log(stc.filters); },
      setFilters: (filters) => { console.log(filters); },
      // export utils for external functions
      utils,
    };
  };
  // Get current path of script by triggering a stack trace
  /*! @source https://gist.github.com/eligrey/5426730 */
  window.StockThumbs.PATH = (() => {
    const filename = 'fileName';
    const stack = 'stack';
    const stacktrace = 'stacktrace';
    const sourceUrl = 'sourceURL';
    const current = 'currentScript';
    let loc = null;
    const matcher = (name, matchedLoc) => {
      loc = matchedLoc;
    };

    // for modern browsers
    if (document[current] && document[current].src !== '') {
      loc = document[current].src;
      return loc.slice(0, loc.lastIndexOf('/') + 1);
    }

    try {
      0(); // throws error
      return false;
    } catch (ex) {
      if (filename in ex) { // Firefox
        loc = ex[filename];
      } else if (sourceUrl in ex) { // New Safari
        loc = ex[sourceUrl];
      } else if (stacktrace in ex) { // Opera
        ex[stacktrace].replace(/called from line \d+, column \d+ in (.*):/gm, matcher);
      } else if (stack in ex) { // WebKit, Blink, and IE10
        ex[stack].replace(/at.*?\(?(\S+):\d+:\d+\)?$/g, matcher);
      }
      return loc.slice(0, loc.lastIndexOf('/') + 1);
    }
  })();

  // custom event dispatcher
  const notify = (eventName) => {
    const event = new Event(eventName);
    // Dispatch the event.
    console.log(`Dispatching event ${eventName}`);
    window.dispatchEvent(event);
  };

  // notifies main script when everything is loaded
  jqLoaded = (stc) => {
    // get current path of script
    const includePath = window.StockThumbs.PATH;
    const SS = window.StockThumbs;
    SS.$jq = jQuery.noConflict();
    const { $jq } = SS;
    const reqs = {
      keywordx: 'keywordx.min.js',
      imagesloaded: 'imagesloaded.pkgd.min.js',
      adobestocklib: 'adobestocklib.min.js',
      masonry: 'masonry.pkgd.min.js',
    };
      // remove/add custom libraries
    if (stc.custom && (stc.custom.include || stc.custom.exclude)) {
      const { exclude } = stc.custom;
      const { include } = stc.custom;
      if (exclude) {
        exclude.forEach((name) => {
            // eslint-disable-next-line no-prototype-builtins
          if (reqs.hasOwnProperty(name)) {
            delete reqs[name];
          }
        });
      }
      if (include) {
        include.forEach((name) => {
          reqs[name] = `${name}.js`;
        });
      }
      console.log('new includes', reqs);
    }
    // loads other libraries using a promise
    // https://www.geeksforgeeks.org/loading-multiple-scripts-dynamically-in-sequence-using-javascript/
    const multiLoad = (info) => new Promise(((resolve, reject) => {
      const scriptTag = document.createElement('script');
      scriptTag.src = info;
      scriptTag.async = false;
      scriptTag.onload = () => resolve(info);
      scriptTag.onerror = () => reject(info);
      document.body.appendChild(scriptTag);
    }));
    const scriptArr = Object.values(reqs).map((script) => `${includePath}${script}`);
    const promiseData = [];
    scriptArr.forEach((info) => {
      promiseData.push(multiLoad(info));
    });
    Promise.all(promiseData).then(() => {
      console.log(`jQuery ${$jq().jquery} and all libraries loaded.`);
        // dispatch event that searchbar is ready to load
      SS.keywordx = window.keywordx;
      SS.Masonry = window.Masonry;
      notify('StockThumbsReady');
    }).catch((err) => {
      console.log(`${err} failed to load!`);
    });
  };

  const domReadyHandler = (a) => {
    const b = document;
    const c = 'addEventListener';
    if (b[c]) b[c]('DOMContentLoaded', a);
    else window.attachEvent('onload', a);
  };

  domReadyHandler(() => {
    // compares jQuery versions
    // taken from https://stackoverflow.com/a/16187766
    const cmpVersions = (a, b) => {
      let i;
      let diff;
      const regExStrip0 = /(\.0+)+$/;
      const segmentsA = a.replace(regExStrip0, '').split('.');
      const segmentsB = b.replace(regExStrip0, '').split('.');
      const l = Math.min(segmentsA.length, segmentsB.length);
      for (i = 0; i < l; i += 1) {
        diff = parseInt(segmentsA[i], 10) - parseInt(segmentsB[i], 10);
        if (diff) {
          return diff;
        }
      }
      return segmentsA.length - segmentsB.length;
    };

    let isJQCalled = false;
    const checkJQ = () => {
      // check for jQuery and load conditionally if version 1.9 or higher
      let timerId;
      if ((typeof window.jQuery === 'undefined' && !window.jQuery) || (cmpVersions('1.9', window.jQuery().jquery) >= 0)) {
        if (!isJQCalled) {
          const jQ = document.createElement('script');
          jQ.type = 'text/javascript';
          jQ.onload = jQ.onreadystatechange;
          // jQ.onload = jqLoaded;
          jQ.src = `${window.StockThumbs.PATH}/jquery.min.js`;
          document.body.appendChild(jQ);
          isJQCalled = true;
        }
        timerId = setTimeout(() => {
          checkJQ();
        }, 50);
      } else {
        if (timerId) { clearTimeout(timerId); }
        notify('jQueryLoaded');
      }
    };
    checkJQ();
  });
})();
