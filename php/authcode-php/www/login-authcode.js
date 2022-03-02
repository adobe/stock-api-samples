/* eslint-disable no-console */
/**
 *  UI functions for authentication code login demo
 *  Once user is signed in, app can make requests on behalf of user
 */

// UI login state
const AUTH_STATUS = {
  SIGNED_IN: {
    state: true,
    msg: 'User is signed in.',
  },
  SIGNED_OUT: {
    state: false,
    msg: 'User is signed out.',
  },
  UNKNOWN: {
    state: null,
    msg: 'Unknown.',
  },
};

// Stores other constants for app
const K = {
  CSRFKEY: 'x-csrf',
  STATE: 'state',
};

/* register UI elements */
const loginBtn = document.getElementById('csdk-login');
const logoutBtn = document.getElementById('csdk-logout');
const profileBtn = document.getElementById('get-quota');

/* gets/sets session storage items */
function store(name, value) {
  const storage = window.sessionStorage;
  let response = null;
  if (value) {
    // store item
    storage.setItem(name, value);
    response = value;
  } else {
    response = storage.getItem(name);
  }
  return response;
}

/* updates login status text and button UI */
function updateStatus(status) {
  document.getElementById('status').textContent = status.msg;
  if (status && status.state) {
    loginBtn.disabled = 'disabled';
    profileBtn.disabled = false;
    logoutBtn.disabled = false;
  } else {
    logoutBtn.disabled = 'disabled';
    profileBtn.disabled = 'disabled';
    loginBtn.disabled = false;
  }
}

/* checks for csrf token in header and stores it, or returns stored value */
function getCSRF(xhr = undefined) {
  if (xhr) {
    // store csrf from response header if it exists
    const csrf = xhr.getResponseHeader(K.CSRFKEY);
    if (csrf) {
      // store in session data
      store(K.CSRFKEY, csrf);
      return true;
    }
      // csrf doesn't exist
    console.warn('No csrf token found');
    return false;
  }
  // return stored csrf
  return store(K.CSRFKEY);
}

function getBasePath() {
  const loc = window.location;
  const path = loc.pathname;
  if (!loc.origin) { // for IE
    loc.origin = `${loc.protocol}//${loc.hostname}${(loc.port ? `:${loc.port}` : '')}`;
  }
  const pathArr = path.split('/');
  // to get full URL, add ${loc.origin}
  const hostPath = `${pathArr.slice(0, pathArr.length - 1).join('/')}/`.slice(0, -1);
  return hostPath;
}

// https://stackoverflow.com/a/60963711
function shuffle(str) {
  return [...str].sort(() => Math.random() - 0.5).join``;
}

/* Helper utility to get data from server app */
function httpRequest(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    // add csrf to header
    xhr.setRequestHeader(K.CSRFKEY, getCSRF());
    xhr.onload = () => {
      // attempt to get csrf from header
      getCSRF(xhr);
      const data = JSON.parse(xhr.response);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(data);
      }
    };
    xhr.send();
  }, (error) => {
    console.error(error); // Stacktrace
  }).catch((error) => {
    // throw back to caller
    throw error;
  });
}

/**
 *  Redirects to signin endpoint, starting OAuth flow
 *  Endpoint is a local script on this server, which will redirect to IMS
 */
function handleLogin() {
  const csrf = getCSRF();
  if (csrf) {
    // randomize string to use as state
    const state = shuffle(csrf);
    // store in session data for comparison
    store(K.STATE, state);
    window.location.assign(`${getBasePath()}/auth/signin?state=${state}`);
  } else {
    // refresh page
    window.location.reload();
  }
}

/* Redirects to signout endpoint on server app */
function handleLogout() {
  window.location.assign(`${getBasePath()}/auth/signout`);
  console.log('Signing out...');
}

/**
 * Calls protected resource (Member/Profile) from Stock API
 * Requires user to be signed in
 */
function getQuota() {
  const quotaRequest = httpRequest(`${getBasePath()}/profile/quota`);
  quotaRequest.then((data) => {
    // success
    console.log(data);
    document.getElementById('quota').textContent = data.quota;
  }, (reason) => {
    // error
    console.error(reason);
  });
}

/**
 * Requests displayName of user from server app
 * This is retrieved after sign-in
 */
function getName() {
  return new Promise((resolve, reject) => {
    const nameRequest = httpRequest(`${getBasePath()}/profile/name`);
    nameRequest.then((data) => {
      console.log(data.name);
      // return user name
      resolve(`${data.name} is signed in.`);
    }, (reason) => {
      // error
      console.error(reason);
      reject(reason);
    });
  });
}

/**
  * Checks if session data exists
  * If unknown, requests token validation and renew login
  * Then updates UI
*/
function getStatus() {
  let status = AUTH_STATUS.UNKNOWN;
    // check login status from server
  const renewRequest = httpRequest(`${getBasePath()}/auth/renew`);
  renewRequest.then((data) => {
    if (data && data > 0) {
      console.log(`token good for ${Math.floor(data / 60)} minutes.`);
        // update status
      status = AUTH_STATUS.SIGNED_IN;
      updateStatus(status);
    } else {
      status = AUTH_STATUS.SIGNED_OUT;
      updateStatus(status);
    }
  }, (err) => {
    // problem with getting status-- set custom message
    const stat = { ...AUTH_STATUS };
    stat.UNKNOWN.msg = (err.message || err);
    updateStatus(stat.UNKNOWN);
    console.warn(err);
  }).catch((err) => {
    console.error(err.message || err);
  });
}

/* Event handlers for buttons */
loginBtn.addEventListener('click', handleLogin, false);
logoutBtn.addEventListener('click', handleLogout, false);
profileBtn.addEventListener('click', getQuota, false);

/* When page reloads, get profile name and login status */
document.addEventListener('DOMContentLoaded', () => {
  // first check if name is set in profile
  getStatus();
});
