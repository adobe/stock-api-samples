console.log('Custom script loaded');

(() => {
  const cpThumbs = {};
  let stockThumbsConfig = {};

  function getTmplString(html, args) {
    return html.call(this, args);
  }

  // converts html string to DOM element
  // taken from https://stackoverflow.com/a/35385518
  const htmlToElement = ((htmlString) => {
    const template = document.createElement('template');
    const html = htmlString.trim();
    template.innerHTML = html;
    return template.content.firstChild;
  });

  /**
   * Creates node list from search data
   * @param {array} files array of JSON data
   * @returns {object} document fragment list of nodes
   */
  const createThumbList = ((files) => {
    const cp = cpThumbs;
    const stc = stockThumbsConfig;
    // create cta tracking url and text
    const { utils, overlayText, ctaUrl } = cp;
    const ctaText = overlayText(utils.getTrackingUrl(`${ctaUrl}?as_campaign=${utils.getHost()}`, stc));
    // create doc fragment consisting of node list
    const list = document.createDocumentFragment();
    files.forEach((row) => {
      // create substitution values for html string
      const args = {
        ctaText,
      };
      // add result fields
      Object.entries(row).forEach((field) => {
        // transform details URL with tracking data
        if (field[0] === 'details_url') {
          args.details_url = utils.getTrackingUrl(field[1], stc);
        } else {
          // eslint-disable-next-line prefer-destructuring
          args[field[0]] = field[1];
        }
      });
      // replace variables in html string and create thumb node
      list.appendChild(htmlToElement(getTmplString(cp.html, args)));
    });
    return list;
  });

  /**
   * Returns cloned nodes for further manipulation
   * @param {string} name DOM name of parent
   * @returns {object} cloned node
   */
  const cloneNodeList = (name) => {
    // will only get first matching element
    const parent = document.querySelector(name) || null;
    const nodeClone = parent.cloneNode(true);
    return nodeClone.childNodes;
  };

  /**
   * Removes all node children
   * @param {string} name DOM name of parent
   * @returns {object} emptied node
   */
  const emptyNode = (name) => {
    const el = document.querySelector(name);
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
    return el;
  };

  /**
   * Interleaves target node members with nodes from source
   * 1. Get [count] nodes from source and add to newList
   * 2. Add [count] target nodes
   * 3. If repeat is true, return to 1
   * 4. Add rest of target nodes   * @param {object} source new node list content
   * @param {object} target existing node list to be combined
   * @param {array} prefs (number, boolean) number of items to interleave, and whether to repeat
   * @returns {object} combined node list with new children
   */
  const combineNodes = (source, target, prefs) => {
    // set how many items to interleave (default 1)
    let count = 1;
    // sets whether to repeat insertion (default true)
    let repeat = true;
    // check if prefs array is set
    if (prefs) {
      count = (typeof prefs[0] === 'number') ? prefs[0] : count;
      repeat = (prefs[1] !== undefined && prefs[1] !== null && typeof prefs[1] === 'boolean') ? prefs[1] : repeat;
    }
    // returns new nodelist
    const newList = document.createDocumentFragment();
    // convert target and source node list to array
    let srcNodeList = Array.from(source.childNodes)
    let targNodeList = Array.from(target);
    const getValidNode = (arr) => {
      let node = null;
      while (arr.length > 0 && !node) {
        // get first element
        const tempNode = arr.shift();
        // check if element
        if (tempNode.nodeType === Node.ELEMENT_NODE) {
          node = tempNode.cloneNode(true);
        }
      }
      return {
        node,
        list: arr,
      };
    };
    while (targNodeList.length > 0) {
      // build list of source nodes
      for (let srcIdx = 0; srcIdx < count; srcIdx += 1) {
        // check if element node and add to new list
        const nodeCheck = getValidNode(srcNodeList);
        if (nodeCheck.node) {
          // add to list
          newList.appendChild(nodeCheck.node);
          // update array
          srcNodeList = nodeCheck.list;
        }
      }
      // now do the same for target nodes if repeat is true
      if (repeat) {
        for (let srcIdx = 0; srcIdx < count; srcIdx += 1) {
          const nodeCheck = getValidNode(targNodeList);
          if (nodeCheck.node) {
            // add to list
            newList.appendChild(nodeCheck.node);
            // update array
            targNodeList = nodeCheck.list;
          }
        }
      } else {
        // add remainder of nodes to list
        while (targNodeList.length > 0) {
          const targetNode = targNodeList.shift();
          newList.appendChild(targetNode.cloneNode(true));
        }
      }
    }
    return newList;
  };

  // add global objects if they don't exist
  const StockThumbs = window.StockThumbs || {};
  StockThumbs.config = StockThumbs.config || {};
  StockThumbs.config.custom = StockThumbs.config.custom || {};

  // run any setup code here
  StockThumbs.config.custom.init = (config, stockThumbsMain) => {
    console.log('custom init called');
    // get access to utility methods
    stockThumbsConfig = config;
    const cp = cpThumbs;
    // store utility functions and custom text/html
    cp.utils = stockThumbsMain.utils;
    cp.resultColumns = stockThumbsConfig.custom.result_columns;
    cp.overlayText = stockThumbsConfig.custom.overlayText;
    cp.ctaUrl = stockThumbsConfig.custom.ctaUrl;
    cp.html = stockThumbsConfig.custom.html;
    if (!cp.overlayText || !cp.html || !cp.resultColumns) {
      throw new Error('StockThumbs config is missing required overlayText, html, or result_columns members.');
    } else if (!(typeof cp.html === 'function')) {
      throw new Error('html element in StockThumbs config must be a function which returns a template string.');
    }
  };
  // run main functionality after search
  StockThumbs.config.custom.exec = (result) => {
    console.log('custom exec called');
    const stc = stockThumbsConfig;
    // creates document fragment consisting of new list of nodes
    const source = createThumbList(result);
    // gets child nodes from cloned target
    const target = cloneNodeList(stc.parentId);
    if (!source || !target) {
      throw new Error('ParentID or HTML is invalid');
    }
    const combined = combineNodes(source, target, stc.custom.interleave);
    if (window.jQuery && window.Masonry) {
      const $jq = window.jQuery;
      // replace existing node children with new list
      emptyNode(stc.parentId).appendChild(combined);
      const $cont = $jq(stc.parentId);
      $cont.imagesLoaded(() => {
        // remove existing masonry
        $cont.masonry('destroy');
        // re-layout items
        $cont.masonry({ itemSelector: '.edd_download' });
      });
    }
  };
})();

// Make script visible in console. see https://stackoverflow.com/a/23701451
// eslint-disable-next-line spaced-comment
//# sourceURL=./custom-creativepixel.js
