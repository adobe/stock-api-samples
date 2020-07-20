/**
 *  UI functions for authentication code login demo
 *  Once user is signed in, app can make requests on behalf of user
 */

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

/* register UI elements */
const loginBtn = document.getElementById('csdk-login');
const logoutBtn = document.getElementById('csdk-logout');
const profileBtn = document.getElementById('get-quota');

/* updates login status text and button UI */
function updateStatus(status, msg) {
  document.getElementById('status').textContent = msg;
  if (status) {
    loginBtn.disabled = 'disabled';
    profileBtn.disabled = false;
    logoutBtn.disabled = false;
  } else {
    logoutBtn.disabled = 'disabled';
    profileBtn.disabled = 'disabled';
    loginBtn.disabled = false;
  }
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

/* Checks if URL contains 'signed_in=true|false' or unknown */
function getStatus() {
  const s = window.location.search;
  const re = /signed_in=(true|false)/g;
  const statusCheck = re.exec(s);
  let status = AUTH_STATUS.UNKNOWN;
  if (statusCheck && JSON.parse(statusCheck[1])) status = AUTH_STATUS.SIGNED_IN;
  else if (statusCheck && !JSON.parse(statusCheck[1])) status = AUTH_STATUS.SIGNED_OUT;
  updateStatus(status.state, status.msg);
}

/* Helper utility to get data from server app */
function httpRequest(url, headers = false) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // send a headers-only request if headers is true
    const type = (headers) ? 'HEAD' : 'GET';
    xhr.open(type, url);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.response);
        resolve(data);
      } else {
        reject(xhr.response);
      }
    };
    xhr.onerror = () => reject(xhr.response);
    xhr.send();
  });
}

/**
 *  Redirects to signin endpoint, starting OAuth flow
 *  Endpoint is a local script on this server, which will redirect to IMS
 */
function handleLogin() {
  location.assign(`${getBasePath()}/auth/signin`);
}

/* Redirects to signout endpoint on server app */
function handleLogout() {
  location.assign(`${getBasePath()}/auth/signout`);
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
  const nameRequest = httpRequest(`${getBasePath()}/profile/name`);
  nameRequest.then((data) => {
    console.log(data.name);
    // update user name
    AUTH_STATUS.SIGNED_IN.msg = `${data.name} is signed in.`;
  }, (reason) => {
    // error
    console.error(reason);
  }).then(() => {
    // now check login status
    getStatus();
  });
}

/* Event handlers for buttons */
loginBtn.addEventListener('click', handleLogin, false);
logoutBtn.addEventListener('click', handleLogout, false);
profileBtn.addEventListener('click', getQuota, false);

/* When page reloads, get profile name and login status */
document.addEventListener('DOMContentLoaded', () => {
  // first check if name is set in profile
  getName();
});
