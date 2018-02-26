<?php

namespace SdkDemo\Utils;

use SdkDemo\Config\AppConfig;
use Firebase\JWT\JWT;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\TransferException;

class ImsToken
{

    private $access_token = '';

    public function __construct($config)
    {

        # server parameters
        $ims_host = $config::IMS_HOST;
        $ims_scope = $config::IMS_SCOPE;
        $ims_endpoint_jwt = $config::IMS_ENDPOINT_JWT;

        # enterprise parameters used to construct JWT
        $org_id = $config::ORG_ID;
        $api_key = $config::API_KEY;
        $client_secret = $config::CLIENT_SECRET;
        $tech_acct = $config::TECH_ACCT;
        $priv_keyname = $config::PRIV_KEYNAME;
        $priv_keypath = AppConfig::getPrivateKeypath($priv_keyname);

        # Construct JSON Web Token

        # set expiry time for JSON Web Token
        $expiry_time = time() + 60*60*24;

        # format scope and audience claims
        $aud_url = sprintf('https://%s/c/%s', $ims_host, $api_key);
        $scope_url = sprintf('https://%s/s/%s', $ims_host, $ims_scope);

        # create payload
        $payload = array(
            "exp" => $expiry_time,
            "iss" => $org_id,
            "sub" => $tech_acct,
            "aud" => $aud_url,
            $scope_url => true
        );

        # read private key from file
        $private_key = file_get_contents($priv_keypath);
        
        # create and sign JSON web token
        $jwt_token = JWT::encode($payload, $private_key, 'RS256');

        # For debugging: uncomment the commands below
        # (DEBUG) dump payload to file
        # file_put_contents('../payload.json', json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        # (DEBUG) dump JWT to file
        # file_put_contents('../jwt.txt', $jwt_token);

        # Construct access request to IMS

        # Using Guzzle to make request to IMS because it is already required for PHP SDK
        $client = new Client([
            'timeout'  => 2.0,
            'headers' => [
                'Content-Type' => 'application/x-www-form-urlencoded',
                'Cache-Control' => 'no-cache'
            ],
            'http_errors' => true
        ]);

        # add form parameters
        $params = [
            'form_params' => [
                'client_id' => $api_key,
                'client_secret' => $client_secret,
                'jwt_token' => $jwt_token
            ]
        ];

        # make a post to IMS and get response
        try {
            $response = $client->request(
                'POST',
                sprintf('https://%s/%s', $ims_host, $ims_endpoint_jwt),
                $params
            );
    
            # response will be JSON; field needed is 'access-token'
            /*
            {
                "token_type":"bearer",
                "access_token":"eyJ4N...",
                "expires_in":86399991
            }
            */
            
            # convert response to json object
            $data = json_decode($response->getBody());
            $this->access_token = $data->access_token;
        } catch (TransferException $e) {
            if ($e->hasResponse()) {
                $err = json_decode($e->getResponse()->getBody())->error_description;
                throw new \Exception($err);
            } else {
                throw new \Exception($e->getCode() . ': ' . $e->getMessage());
            }
        }
    }

    public function getAccessToken()
    {
        if ($this->access_token !== '') {
            return $this->access_token;
        }
    }
}
