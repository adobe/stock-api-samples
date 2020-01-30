<?php

namespace IMS {

    class AuthCode
    {

        public function __construct($routes, $params)
        {
            $endpoint = (count($routes) > 1) ? $endpoint = $routes[1] : $routes[0];
            switch ($endpoint) {
                case 'signin':
                    Utils::debug('Called /signin', 'endpoint');
                    $this->login();
                    break;
                case 'token':
                    Utils::debug('Called /token', 'endpoint');
                    $this->token($params);
                    break;
                case 'signout':
                    Utils::debug('Called /signout', 'endpoint');
                    $this->logout();
                    break;
                default:
                    Utils::debug('Called something else', 'endpoint');
                    break;
            }
        }

    #  1. This endpoint is called by the web page to trigger login.
    #  2. It redirects to ims/authorize
    #  required params: client_id (api key), scope, response_type, redirect_uri
    #
        private function login()
        {
            $CFG = $GLOBALS['AUTH_CONFIG'];
      # add api key and redirect URI to query string
            $redirect = $CFG->REDIRECT_URI;
            Utils::debug($redirect, 'redirect URI');
            $query = sprintf('client_id=%s&redirect_uri=%s', $CFG->API_KEY, $redirect);
      # add scopes and response type to query string
            $query .= sprintf('&scope=%s&response_type=code', $CFG->SCOPES);
      # store referer path (original sign-in page) for later use
            $basepath = Utils::get_base_path();
            $refer = (array_key_exists('HTTP_REFERER', $_SERVER)) ? Utils::get_referer($_SERVER['HTTP_REFERER']) : $basepath . '/public/login-authcode.html';
            if (!isset($_SESSION['refer'])) {
                $_SESSION['refer'] = $refer;
            } else {
                $refer = $_SESSION['refer'];
            }
            Utils::debug($refer, 'referer');
      # redirect to authorize
            $ims_url = "https://$CFG->IMS_HOSTNAME/ims/authorize?$query";
            Utils::redirect("https://$CFG->IMS_HOSTNAME/ims/authorize", $query);
        }

    #  Redirect URI endpoint
    #  3. IMS calls and provides auth code
    #  /auth/token?code=eyJ4NXU...
    #  Then makes separate POST (see #4)
    #  5. After successful POST to get token, redirect back to login page
    #  After signout, this endpoint is called again
    #  7. After logout, redirect back to signin page
    #
        private function token($params)
        {
            $redirect_count = 0;
            if (isset($params['code'])) {
        # if code= param exists, this is a sign-in event
                $code = $params['code'];
        # get token response
                $data = $this->requestImsToken($code);
                Utils::debug($data, 'token response');
        # save token and profile data to cookie
                $session = [
                    'access_token' => $data->access_token,
                    'refresh_token' => $data->refresh_token,
                    'expires' => $data->expires_in / 1000, # convert ms to seconds
                    'displayName' => $data->name,
                ];
                $session['account_type'] = isset($data->account_type) ? $data->account_type : null;

                foreach ($session as $key => $val) {
          # setcookie: name, value, expires, path on server, domain, secure, http-only
          # https://stackoverflow.com/a/33277534 set path as '/'
                    setcookie($key, $val, time() + $session['expires'], '/', $_SERVER['SERVER_NAME'], true, true);
                }
                // Utils::debug($_COOKIE, 'setcookie');
        # now redirect back to login page
                $refer = (isset($_SESSION['refer'])) ? $_SESSION['refer'] : null;
                $redirect_count++;
        # to prevent infinite redirect in case something goes wrong
                if ($redirect_count > 4) {
                    Utils::debug('too many redirects', 'exiting');
                    exit;
                }
                Utils::redirect($refer, 'signed_in=true');
            } else {
        # signout event: destroy cookie
                Utils::debug('signing out', 'logout');
                $redirect_count++;
                if ($redirect_count > 4) {
                    exit;
                }
                $refer = (isset($_SESSION['refer'])) ? $_SESSION['refer'] : null;
                Utils::clearCookies();
                Utils::redirect($refer, 'signed_in=false');
            }
        }

    #  4. App POSTs auth code to IMS to get back token
    #  required fields: grant_type, client_id, client_secret, code
    #  5. IMS reponds with multiple fields, including access and refresh tokens
    #
        private function requestImsToken($auth_code)
        {
            $CFG = $GLOBALS['AUTH_CONFIG'];
            $requestForm = [
                'grant_type' => 'authorization_code',
                'client_id' => $CFG->API_KEY,
                'client_secret' => $CFG->SECRET,
                'code' => $auth_code,
            ];
            $reqOptions = (object)[
                'hostname' => $CFG->IMS_HOSTNAME,
                'path' => '/ims/token',
                'method' => 'POST',
                'headers' => [
                    'Content-Type' => 'application/x-www-form-urlencoded',
                ],
                'params' => $requestForm,
                'chs_debug' => false
            ];
            Utils::debug($reqOptions, 'POST options');
            return Utils::http_request($reqOptions);
        }

        private function logout()
        {
            $CFG = $GLOBALS['AUTH_CONFIG'];
            if (isset($_COOKIE['access_token'])) {
        # get token from cookie
                $token = $_COOKIE['access_token'];
                $signout_options = [
                    'access_token' => $token,
                    'redirect_uri' => $CFG->REDIRECT_URI,
                ];
                Utils::debug('signing out', 'logout');
                $refer = (array_key_exists('HTTP_REFERER', $_SERVER)) ? Utils::get_referer($_SERVER['HTTP_REFERER']) : null;
                if (!isset($_SESSION['refer'])) {
                    $_SESSION['refer'] = $refer;
                } else {
                    $refer = $_SESSION['refer'];
                }
                Utils::redirect("https://$CFG->IMS_HOSTNAME/ims/logout", http_build_query($signout_options));
            } else {
        # already signed out--redirect back to client app
                $refer = (array_key_exists('HTTP_REFERER', $_SERVER)) ? Utils::get_referer($_SERVER['HTTP_REFERER']) : null;
                if (!isset($_SESSION['refer'])) {
                    $_SESSION['refer'] = $refer;
                } else {
                    $refer = $_SESSION['refer'];
                }
                Utis::clearCookies();
                Utils::redirect($refer, 'signed_in=false');
            }
        }
    }
}
