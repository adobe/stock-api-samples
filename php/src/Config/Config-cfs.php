<?php

namespace AdobeIO;

# Adobe I/O config variables
class Config {
  public $APPNAME = 'CFSPHPSDK/1.0';
  public $API_KEY = 'b4e3ee08719247cc85e9ba92970b1028';
  public $TECH_ACCT = '91273E0D59FA3B210A495D56@techacct.adobe.com';
  public $ORG_ID = 'B22442B959EA26570A495EC7@AdobeOrg';
  public $SECRET = 'a5b1ee85-aa0b-4c38-abdc-107f32e7223c';
  public $PRIV_KEYNAME = './partnerdemo1101.key';
  public $JWT_SCOPES = 'ent_stocksearch_sdk';

  public function __get($name) {
    if ($name === 'REDIRECT_URI') {
      $this->REDIRECT_URI = 'https://' . $_SERVER['SERVER_NAME'] . Utils::get_base_path() . '/auth/token';
      return $this->REDIRECT_URI;
    }
  }
}
?>