/**
 * Copyright 2021 Adobe Systems Incorporated. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 *  Adobe IMS auth code workflow
 *  Node.js + Express server example
 */

const fs = require('fs');
const express = require('express');
const https = require('https');
const querystring = require('querystring');
const cookieSession = require('cookie-session');

// stores client app name for redirects
let clientAppRefer = '';

// get token and other profile data from IMS response and save to cookie
function saveSession(body) {
  const session = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    account_type: body.account_type,
    expires: body.expires_in,
    displayName: body.name,
  };
  console.log('Session profile:', session);
  return session;
}

// saves referer (client app page) for eventual redirection
function saveReferer(referVal) {
  const re = /^https?:\/\/[^/]+(\/[^?]+).*/;
  const referer = (referVal) ? referVal.match(re)[1] : null;
  if (referer) clientAppRefer = referer;
}

// utility to send requests, get back responses and return a Promise
function httpRequest(options, form = null) {
  const reqOptions = options;
  return new Promise((resolve, reject) => {
    const req = https.request(reqOptions, (res) => {
      const status = res.statusCode;
      console.log('Status: %s', status);
      console.log('Headers: %s', JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', (body) => {
        console.log('response: ', body);
        let response = JSON.parse(body);
        if (status < 400) {
          resolve(response);
        } else {
          console.error(response);
          response = (response.error) ? response.error : response;
          reject(new Error(`${status}: ${response}`));
        }
      });
    });
    req.on('error', (err) => {
      reject(err);
    });
    // does a form need to be sent?
    if (form) {
      // write data to request body (convert to query string)
      req.write(querystring.stringify(form));
    }
    req.end();
  });
}

/**
 *  4. App POSTs auth code to IMS to get back token
 *  required fields: grant_type, client_id, client_secret, code
 *  5. IMS reponds with multiple fields, including access and refresh tokens
 */
function requestImsToken(authCode, CONFIG) {
  const reqOptions = {
    hostname: CONFIG.IMS_HOSTNAME,
    path: '/ims/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  const requestForm = {
    grant_type: 'authorization_code',
    client_id: CONFIG.API_KEY,
    client_secret: CONFIG.SECRET,
    code: authCode,
  };
  console.log('POST body:', requestForm);
  return httpRequest(reqOptions, requestForm);
}

/**
 *  sample method that gets a protected resource from Stock API
 */
function getMemberProfile(token, CONFIG) {
  const params = {
    license: 'Standard',
    locale: 'en_US',
  };
  const headers = {
    'X-Product': CONFIG.API_APPNAME,
    'x-api-key': CONFIG.API_KEY,
    Authorization: `Bearer ${token}`,
  };
  const options = {
    hostname: CONFIG.API_HOSTNAME,
    path: `/Rest/Libraries/1/Member/Profile?${querystring.stringify(params)}`,
    method: 'GET',
    headers,
  };
  return httpRequest(options);
}

function AuthcodeServer(configPath) {
  const app = express();
  let server = null;
  const CONFIG = require(configPath);

  // use a self-signed SSL certificate
  const serverOptions = {
    key: fs.readFileSync(CONFIG.SERVER_KEY),
    cert: fs.readFileSync(CONFIG.SERVER_CERT),
  };

  /* Routes/endpoints for sample app */
  const router = express.Router();

  // Configure cookie storage
  app.use(cookieSession({
    name: 'session',
    secret: CONFIG.SECRET,
    // cookie options
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true,
    httpOnly: true,
  }));

  router.use((req, res, next) => {
    // log each request to the console
    console.log(req.method, req.url);
    // continue to the route
    next();
  });

  /**
   *  1. This endpoint is called by the web page to trigger login.
   *  2. It redirects to ims/authorize
   *  required params: client_id (api key), scope, response_type, redirect_uri
   */
  router.get('/auth/signin', (req, res) => {
    // add api key and redirect URI to query string
    const uri = CONFIG.REDIRECT_URI.replace('{PORT}', CONFIG.PORT);
    let query = `client_id=${CONFIG.API_KEY}&redirect_uri=${uri}`;
    // add scopes and response type to query string
    query += `&scope=${CONFIG.SCOPES}&response_type=code`;
    // store referer path (original sign-in page) for later use
    saveReferer(req.get('Referer'));
    res.redirect(`https://${CONFIG.IMS_HOSTNAME}/ims/authorize?${query}`);
  });

  /**
   *  Redirect URI endpoint
   *  3. IMS calls and provides auth code
   *  /auth/token?code=eyJ4NXU...
   *  Then makes separate POST (see #4)
   *  5. After successful POST to get token, redirect back to login page
   *  After signout, this endpoint is called again
   *  7. After logout, redirect back to signin page
   */
  router.get('/auth/token', (req, res) => {
    const { code } = req.query;
    if (code) { // this is a sign-in event
      const tokenRequest = requestImsToken(code, CONFIG);
      // get Promise returned
      tokenRequest.then((data) => {
        console.log('success: redirecting!');
        const session = saveSession(data);
        // save user profile and token to cookie
        req.session.profile = session;
        res.redirect(`${clientAppRefer}?signed_in=true`);
      }, (reason) => {
        // redirect with error
        console.log('***FAILURE: %s', reason);
        res.redirect(`${clientAppRefer}`);
      });
    } else { // signout event: destroy session
      req.session = null;
      console.log('logout completed');
      res.redirect(`${clientAppRefer}?signed_in=false`);
    }
  });

  /**
   *  6. Called by web page, redirects to signout endpoint
   */
  router.get('/auth/signout', (req, res) => {
    if (req.session.profile) {
      // get token from session cookie
      const token = req.session.profile.access_token;
      const uri = CONFIG.REDIRECT_URI.replace('{PORT}', CONFIG.PORT);
      const signoutOptions = {
        access_token: token,
        redirect_uri: uri,
      };
      res.redirect(`https://${CONFIG.IMS_HOSTNAME}/ims/logout?${querystring.stringify(signoutOptions)}`);
    } else {
      // already signed out--redirect back to client app
      saveReferer(req.get('Referer'));
      res.redirect(`${clientAppRefer}?signed_in=false`);
    }
  });

  /**
   *  Route requiring sign-in
   *  /profile/name : Returns value of displayName from IMS profile
   */
  router.get('/profile/name', (req, res) => {
    try {
      const n = req.session.profile.displayName;
      const name = (n !== '') ? n : 'Profile name not available.';
      res.send({ name });
    } catch (err) {
      res.status(401).send('Profile name not available. Make sure user is signed in.');
    }
  });

  /**
   *  Route requiring sign-in
   *  /profile/quota : Returns Stock quota
   */
  router.get('/profile/quota', (req, res) => {
    try {
      const quotaResponse = { quota: 0 };
      // get token from session cookie
      const token = req.session.profile.access_token;
      // call Member/Profile and get returned Promise
      const profileRequest = getMemberProfile(token, CONFIG);
      profileRequest.then((data) => {
        quotaResponse.quota = data.available_entitlement.quota;
        res.send(quotaResponse);
      }, (reason) => {
        // redirect with error
        console.log('***FAILURE: %s', reason);
        res.send(reason);
      });
    } catch (err) { // signed out
      res.status(401).send('User is not signed in.');
    }
  });

  // apply the routes
  app.use('/', router);

  // create the server and listen on port 8443
  server = https.createServer(serverOptions, app);
  server.listen(CONFIG.PORT);

  // serve static assets from /www
  app.use(express.static('./www'));

  console.log(`If you don't see any errors, open in your browser:\n  https://localhost:${CONFIG.PORT}/`);
}

module.exports.AuthcodeServer = AuthcodeServer;
