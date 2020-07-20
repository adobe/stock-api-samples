<?php

namespace IMS {

  class Profile {
    
    public function __construct($routes, $params) {
      $endpoint = (count($routes) > 1) ? $endpoint = $routes[1] : $routes[0];
      switch ($endpoint) {
        case 'name':
          Utils::debug('Called /name', 'endpoint');
          $this->getName();
          break;
        case 'quota': 
          Utils::debug('Called /quota', 'endpoint');
          $this->getQuota();
          break;
        default:
          Utils::debug('Called something else', 'endpoint');
          break;
      }
    }

     #  Route requiring sign-in
     #  /profile/name : Returns value of displayName from IMS profile stored in cookie
     #
    private function getName() {
      header('Content-Type: application/json');
      if (isset($_COOKIE['access_token'])) {
        try {
          $n = $_COOKIE['displayName'];
          $name = ($n !== '') ? $n : 'Profile name not available.';
          echo json_encode(['name' => $name]);
        } catch (Exception $err) {
          Utils::debug($err, 'getName error');
          $msg = 'Profile name not available. Make sure user is signed in.';
          http_response_code(401);
          echo json_encode($msg);
          exit;
        }
      } else {
        $msg = 'User not signed in.';
        http_response_code(401);
        echo json_encode($msg);
        exit;
      }
    }

    #  Route requiring sign-in
    #  /profile/quota : Returns Stock quota
    #
    private function getQuota() {
      header('Content-Type: application/json');
      try {
        # create response object
        $quotaResponse = new \stdClass();
        $quotaResponse->quota = 0;
        # get token from session cookie
        $token = $_COOKIE['access_token'];
        # call Member/Profile and get returned Promise
        $profileRequest = $this->getMemberProfile($token);
        Utils::debug($profileRequest, 'getMemberProfile');
        $quota = $profileRequest->available_entitlement->quota;
        echo json_encode((['quota' => $quota]));
      } catch (Exception $err) { # signed out
        http_response_code(401);
        echo json_encode('User is not signed in.');
        exit;
      }
    }

    #  sample method that gets a protected resource from Stock API
    #  see: https://www.adobe.io/apis/creativecloud/stock/docs/api/content.html
    #
    private function getMemberProfile($token) {
      $CFG = $GLOBALS['AUTH_CONFIG'];
      $query = [
        'license' => 'Standard',
        'locale' => 'en_US',
      ];
      $reqOptions = (object) [
        'hostname' => $CFG->API_HOSTNAME,
        'path' => '/Rest/Libraries/1/Member/Profile',
        'method' => 'GET',
        'headers' => [
          'X-Product' => $CFG->API_APPNAME,
          'x-api-key' => $CFG->API_KEY,
          'Authorization' => "Bearer $token",
        ],
        'params' => $query,
        'chs_debug' => false
      ];
      Utils::debug($reqOptions, 'get profile options');
      return Utils::http_request($reqOptions);
    }

  }

}