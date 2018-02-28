<?php
/**
 * Copyright 2017 Adobe Systems Incorporated. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

namespace SdkDemo\Config;

# Adobe I/O config variables: Get values from console.adobe.io

class AppConfig
{
    # only app name and api key are required for search
    const APP_NAME = 'MySampleApp/1.0';
    const API_KEY = 'your-api-key-here';

    # these fields are required for creating tokens and licensing
    const TECH_ACCT = 'your-tech-acct-guid@techacct.adobe.com';
    const ORG_ID = 'your-org-guid@your-org';
    const CLIENT_SECRET = 'your-client-secret-here';
    # generate private key and store in ./Config folder
    const PRIV_KEYNAME = 'server_key.pem';
    # verify this scope matches your app JWT settings
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
