<?php

namespace IMS {

use Exception;

class AuthCode
    {

        public function __construct($routes, $params)
        {
            try {
                $endpoint = (count($routes) > 1) ? $endpoint = $routes[1] : $routes[0];
                # add csrf check here and in profile class
                # https://chasingcode.dev/blog/php-handle-undefined-index-gracefully/
                $csrf = $params[Constants::$SVARS['CSRF']] ?? null;
                switch ($endpoint) {
                    case 'signin':
                        // TODO: Test that page still gets csrf by reloading before signing in, implement state= param below
                        Utils::debug('Called /signin', 'endpoint');
                        $this->login($params);
                        break;
                    case 'token':
                        Utils::debug('Called /token', 'endpoint');
                        $this->token($params);
                        break;
                    case 'renew':
                        Utils::debug('Called /renew', 'endpoint');
                        $this->renew($csrf);
                        break;
                    case 'signout':
                        Utils::debug('Called /signout', 'endpoint');
                        $this->logout();
                        break;
                    default:
                        # throws exception if csrf is invalid
                        Utils::checkCSRF($csrf);
                        Utils::debug('Called something else', 'endpoint');
                        break;
                }
            } catch (\ValueError $err) {
                # thrown by checkCSRF
                Utils::debug($err, "ERROR");
            } catch (\Exception $err) {
                # thrown elsewhere
                Utils::debug($err, "ERROR");
            }
        }

        #  1. This endpoint is called by the web page to trigger login.
        #  2. It redirects to ims/authorize
        #  required params: client_id (api key), scope, response_type, redirect_uri
        #
        private function login($params)
        {
            $CFG = $GLOBALS['AUTH_CONFIG'];
            $endpoints = Constants::$ENDPOINTS;
            $svars = Constants::$SVARS;

            $state = $params[$svars['STATE']] ?? null;
            # client must set state param before signing in
            if (isset($state) && !empty($state)) {
                $redirect = $CFG->REDIRECT_URI;
                Utils::debug($redirect, 'redirect URI');
                # add api key and redirect URI to query string
                $query = "client_id={$CFG->API_KEY}&redirect_uri={$redirect}";
                # add scopes, state and response type to query string
                $query .= "&scope={$CFG->SCOPES}&state={$state}&response_type=code";
                # store referer path (original sign-in page) for later use
                $basepath = Utils::get_base_path();
                $refer = (array_key_exists('HTTP_REFERER', $_SERVER)) ? Utils::get_referer($_SERVER['HTTP_REFERER']) : $basepath . '/www/login-authcode.html';
                if (!isset($_SESSION[$svars['REFER']])) {
                    $_SESSION[$svars['REFER']] = $refer;
                } else {
                    $refer = $_SESSION[$svars['REFER']];
                }
                Utils::debug($refer, 'http referer');
                # redirect to authorize
                $ims_url = "https://{$CFG->IMS_HOSTNAME}/{$endpoints['SIGNIN']}?$query";
                Utils::redirect($ims_url, $query);
            } else {
                $msg = 'No state parameter found.';
                Utils::debug($msg, "ERROR");
                Utils::respond($msg, 406);
            }

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
            $svars = Constants::$SVARS;
            if (isset($params['code'])) {
                # if code= param exists, this is a sign-in event
                $code = $params['code'];
                # get token response
                try {
                    $data = $this->requestImsToken($code);
                    Utils::debug($data, 'token response');
                    # save token and profile data to cookie AND session
                    $session = [
                        $svars['ACCESS'] => $data->access_token,
                        $svars['EXPIRES'] => time() + $data->expires_in,
                    ];
                    
                    # store in session data
                    foreach ($session as $key => $val) {
                        Utils::makeCookie($key, $val, $session[$svars['EXPIRES']]);
                        $_SESSION[$key] = $val;
                    }
                    Utils::debug($_COOKIE, 'setcookie');
                    
                    # success: now redirect back to login page
                    $this->handleLogin();
                } catch (\Exception $err) {
                    # problem getting token from code
                    Utils::debug($err, 'ERROR');
                }
            } elseif (isset($params['error'])) {
                # check if redirect includes an error message and throw exception
                $msg = $params['error'];
                $ex = new \Exception($msg);
                # throw $ex;
                Utils::debug($ex, 'ERROR');
                $refer = (isset($_SESSION[$svars['REFER']])) ? $_SESSION[$svars['REFER']] : null;
                Utils::redirect($refer, 'signed_in=false');
            } else {
                # signout event: destroy cookie
                Utils::debug('signing out', 'logout');
                $redirect_count++;
                if ($redirect_count > 4) {
                    exit;
                }
                $refer = (isset($_SESSION[$svars['REFER']])) ? $_SESSION[$svars['REFER']] : null;
                Utils::clearCookies();
                Utils::redirect($refer, 'signed_in=false');
            }
        }

        private function handleLogin() {
            $redirect_count = 0;
            $svars = Constants::$SVARS;
            $refer = (isset($_SESSION[$svars['REFER']])) ? $_SESSION[$svars['REFER']] : null;
            $redirect_count++;
            # to prevent infinite redirect in case something goes wrong
            if ($redirect_count > 4) {
                Utils::debug('too many redirects', 'exiting');
                exit;
            }
            Utils::redirect($refer, 'signed_in=true');
        }

        #  4. App POSTs auth code to IMS to get back token
        #  required fields: grant_type, client_id, client_secret, code
        #  5. IMS reponds with multiple fields, including access token
        #
        private function requestImsToken($auth_code)
        {
            $CFG = $GLOBALS['AUTH_CONFIG'];
            $endpoints = Constants::$ENDPOINTS;
            $requestForm = [
                'grant_type' => 'authorization_code',
                'client_id' => $CFG->API_KEY,
                'client_secret' => $CFG->SECRET,
                'code' => $auth_code,
            ];
            $reqOptions = (object)[
                'hostname' => $CFG->IMS_HOSTNAME,
                'path' => $endpoints['TOKEN'],
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

        # Checks session if token hasn't expired and returns it
        #
        private function renew($csrf)
        {
            $svars = Constants::$SVARS;
            if (isset($_SESSION[$svars['ACCESS']])) {
                try {
                    # throws exception if csrf is invalid
                    Utils::checkCSRF($csrf);
                    $remain = 0;
                    $now = time();
                    $tokenExpiry = $_SESSION[$svars['EXPIRES']];
                    if ($now <= $tokenExpiry) {
                        $remain = $tokenExpiry - $now;
                        Utils::debug("Access token good for {$remain}", 'renew');
                        Utils::respond($remain);
                    } else {
                        $msg = 'Token expiration not available. User should sign in again.';
                        Utils::respond($msg, 401);
                        exit;
                    }
                } catch (\ValueError $err) {
                    # thrown by checkCSRF
                    Utils::debug($err, 'ERROR');
                    Utils::respond('Problem renewing--refresh the page and try again.', 403);
                    exit;
                } catch (\Exception $err) {
                    # thrown elsewhere
                    Utils::debug($err, 'ERROR');
                    Utils::respond('Something happened on the way to renew.', 403);
                    exit;
                }
            } else {
                $msg = 'User not signed in.';
                Utils::respond($msg, 401);
                exit;
            }
        }

        private function logout()
        {
            $CFG = $GLOBALS['AUTH_CONFIG'];
            $svars = Constants::$SVARS;
            $endpoints = Constants::$ENDPOINTS;
            if (isset($_SESSION[$svars['ACCESS']])) {
                # get token from cookie
                $token = $_SESSION['access_token'];
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
                Utils::redirect("https://{$CFG->IMS_HOSTNAME}/{$endpoints['SIGNOUT']}", http_build_query($signout_options));
            } else {
                # already signed out--redirect back to client app
                Utils::doLogout();
            }
        }
    }
}
