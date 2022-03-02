<?php

namespace IMS {

    class Profile
    {

        public function __construct($routes, $params)
        {
            $csrf = $params[Constants::$SVARS['CSRF']] ?? null;
            $endpoint = (count($routes) > 1) ? $endpoint = $routes[1] : $routes[0];
            switch ($endpoint) {
                case 'name':
                    Utils::checkCSRF($csrf);
                    Utils::debug('Called /name', 'endpoint');
                    $this->getName();
                    break;
                case 'quota':
                    Utils::checkCSRF($csrf);
                    Utils::debug('Called /quota', 'endpoint');
                    $this->getQuota();
                    break;
                default:
                    Utils::checkCSRF($csrf);
                    Utils::debug('Called something else', 'endpoint');
                    break;
            }
        }

        #  Route requiring sign-in
        #  /profile/name : Returns value of displayName from IMS profile stored in cookie
        #
        private function getName()
        {
            if (isset($_COOKIE['access_token'])) {
                try {
                    $n = (isset($_COOKIE['displayName'])) ? $_COOKIE['displayName'] : '';
                    $name = ($n !== '') ? $n : '<Profile name not available>';
                    Utils::respond(['name' => $name]);
                } catch (\Exception $err) {
                    Utils::debug($err, 'ERROR');
                    $msg = 'Profile name not available. Make sure user is signed in.';
                    Utils::respond($msg, 401);
                    exit;
                }
            } else {
                $msg = 'User not signed in.';
                Utils::respond($msg, 401);
                exit;
            }
        }

        #  Route requiring sign-in
        #  /profile/quota : Returns Stock quota
        #
        private function getQuota()
        {
            try {
                # create response object
                $quotaResponse = new \stdClass();
                $quotaResponse->quota = 0;
                # get token from session cookie
                $token = $this->getToken();
                # call Member/Profile and get returned Promise
                $profileRequest = $this->getMemberProfile($token);
                Utils::debug($profileRequest, 'getMemberProfile');
                $quota = $profileRequest->available_entitlement->quota;
                Utils::respond(['quota' => $quota]);
            } catch (\Exception $err) { # signed out
                Utils::respond('User is not signed in.', 401);
                exit;
            }
        }

        #  sample method that gets a protected resource from Stock API
        #  see: https://www.adobe.io/apis/creativecloud/stock/docs/api/content.html
        #
        private function getMemberProfile($token)
        {
            $CFG = $GLOBALS['AUTH_CONFIG'];
            $query = [
                'license' => 'Standard',
                'locale' => 'en_US',
            ];
            $token = $this->getToken();
            $reqOptions = (object) [
                'hostname' => $CFG->API_HOSTNAME,
                'path' => '/Rest/Libraries/1/Member/Profile',
                'method' => 'GET',
                'headers' => [
                    'X-Product' => $CFG->API_APPNAME,
                    'x-api-key' => $CFG->API_KEY,
                    'Authorization' => "Bearer {$token}",
                ],
                'params' => $query,
                'chs_debug' => false
            ];
            Utils::debug($reqOptions, 'get profile options');
            return Utils::http_request($reqOptions);
        }

        private function getToken()
        {
            $token = '';
            try {
                if (isset($_COOKIE['access_token'])) {
                    $token = $_COOKIE['access_token'];
                } else {
                    $msg = 'Access token not set. Did you sign in?';
                    throw new \Exception($msg);
                }
            } catch (\Throwable $err) {
                Utils::debug($err, 'ERROR');
                $msg = $err->getMessage();
                http_response_code(401);
                echo json_encode($msg);
                exit;
            }
            return $token;
        }
    }
}
