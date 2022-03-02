<?php

namespace IMS {

    class Constants
    {
        # names of IMS routes
        public static $ENDPOINTS = [
            'SIGNIN' => 'ims/authorize/v2',
            'TOKEN' => 'ims/token/v3',
            // TODO: revoke endpoint requires POST
            // 'SIGNOUT' => 'ims/revoke',
            'SIGNOUT' => 'ims/logout',
        ];

        # names of session vars
        public static $SVARS = [
            'REFER' => 'refer',
            'CSRF' => 'x-csrf',
            'ACCESS' => 'access_token',
            'EXPIRES' => 'expires',
            # name of http cookie with sess id
            'NAME' => 'cfsid',
            # stores state token from client
            'STATE' => 'state',
        ];
    }
}
