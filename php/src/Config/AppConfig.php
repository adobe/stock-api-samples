<?php

namespace SdkDemo\Config;

# Adobe I/O config variables

class AppConfig
{
    # only app name and api key are required for search
    const APP_NAME = 'CFSPHPSDK/1.0';
    const API_KEY = 'b4e3ee08719247cc85e9ba92970b1028';

    # these fields are required for creating tokens and licensing
    const TECH_ACCT = '91273E0D59FA3B210A495D56@techacct.adobe.com';
    const ORG_ID = 'B22442B959EA26570A495EC7@AdobeOrg';
    const CLIENT_SECRET = 'a5b1ee85-aa0b-4c38-abdc-107f32e7223c';
    const PRIV_KEYNAME = 'partnerdemo1101.key';
    const IMS_SCOPE = 'ent_stocksearch_sdk';

    # IMS server constants
    const IMS_HOST = 'ims-na1.adobelogin.com';
    const IMS_ENDPOINT_JWT = 'ims/exchange/jwt';

    # returns full path to private key
    public static function getPrivateKeypath($name)
    {
        $d = realpath(__DIR__);
        $path = realpath("$d/$name");
        return $path;
    }
}
