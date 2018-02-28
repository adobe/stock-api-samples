#!/usr/bin/env php
<?php
/**
 * Copyright 2017 Adobe Systems Incorporated. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

namespace SdkDemo;

error_reporting(-1); # show all errors
require __DIR__ . '/../vendor/autoload.php'; # composer class loader

# Stock API includes for licensing
use \AdobeStock\Api\Client\Http\HttpClient;
use \AdobeStock\Api\Client\AdobeStock;
use \AdobeStock\Api\Request\License as LicenseRequest;
use \AdobeStock\Api\Response\License as LicenseResponse;
use \AdobeStock\Api\Core\Constants;
use \AdobeStock\Api\Request\LicenseHistory as LicenseHistoryRequest;
use \AdobeStock\Api\Models\SearchParamLicenseHistory;

# Guzzle HTTP used to download asset
use \GuzzleHttp\Client;

# Config class in config folder with app constants
# ImsToken class generates access token for service account
use SdkDemo\Utils\ImsToken;
use SdkDemo\Config\AppConfig;

# for license requests, required headers are api key, app name and token
$config = new AppConfig();
$api_key = $config::API_KEY;
$app_name = $config::APP_NAME;

# Get access token
echo "Getting access token...\n";
try {
    $access_token = (new ImsToken($config))->getAccessToken();
    echo "Access token request is successful.\n";
    # (DEBUG) dump token to file
    # $token_file = '../imstoken_' . $expiry_time . '.txt';
    # file_put_contents($token_file, $access_token);
} catch (Exception $e) {
    # If there is an error, the message will be printed here
    exit("ERROR: ". $e->getMessage());
}


# create API client
$http_client = new HttpClient();
# this asset is already licensed by demo account
$media_id = 112670342;

# Get Content/Info to check if asset is already licensed
echo "\nGetting Content/Info...\n";
try {
    $info_request = new LicenseRequest();
    $info_request->setLocale('en_US');
    $info_request->setLicenseState('STANDARD');
    $info_request->setContentId($media_id);
    $adobe_stock_client = new AdobeStock($api_key, $app_name, 'PROD', $http_client);
    $info_response = $adobe_stock_client->getContentInfo($info_request, $access_token);
    $purchase_details = $info_response->getContents()[$info_request->getContentId()]->getPurchaseDetails();
    $state = $purchase_details->state;
    $date_purchased = $purchase_details->date;
    printf("Asset is %s as of %s.\n", $state, $date_purchased);
} catch (\Throwable $e) {
    var_dump($e->getMessage());
}


# Call Member/Profile to get quota and status of media
# (State will be 'possible' even if already licensed)
echo "\nGetting Member/Profile...\n";
try {
    $profile_request = new LicenseRequest();
    $profile_request->setLocale('en_US');
    $profile_request->setLicenseState('STANDARD');
    $profile_request->setContentId($media_id);
    $adobe_stock_client = new AdobeStock($api_key, $app_name, 'PROD', $http_client);
    $profile_response = $adobe_stock_client->getMemberProfile($profile_request, $access_token);
    # get quota available for this type of asset
    $quota = $profile_response->available_entitlement->quota;
    # check if licensing is possible and get message
    $state = $profile_response->purchase_options->state;
    $message = $profile_response->purchase_options->message;
    printf("It is %s to license this item. %s\n", $state, $message);
} catch (\Throwable $e) {
    var_dump($e->getMessage());
}


# Call Content/License to license asset
# (if asset is already licensed it will not be licensed again without license_again flag)
echo "\nGetting Content/License...\n";
try {
    $license_request = new LicenseRequest();
    $license_request->setLocale('en_US');
    $license_request->setLicenseState('STANDARD');
    $license_request->setContentId($media_id);
    $adobe_stock_client = new AdobeStock($api_key, $app_name, 'PROD', $http_client);
    $license_response = $adobe_stock_client->getContentLicense($license_request, $access_token);
    # get remaining quota
    $quota = $license_response->available_entitlement->quota;
    # get purchase state (if already licensed, should be 'purchased')
    $state = $license_response->getContents()[$license_request->getContentId()]->getPurchaseDetails()->state;
    printf("This asset is %s, and your quota is %s.\n", $state, $quota);
} catch (\Throwable $e) {
    var_dump($e->getMessage());
}


# Re-license an asset: If you need to license the same asset more than once
/**
 * Un-comment this section to test this functionality
 * =============
    echo "\nGetting another Content/License...\n";
    try {
        $license_request = new LicenseRequest();
        $license_request->setLocale('en_US');
        $license_request->setLicenseState('STANDARD');
        $license_request->setContentId($media_id);
        # This is a workaround as of Feb 2018; a new method will be added for this functionality
        $license_request->license_again = true;
        $adobe_stock_client = new AdobeStock($api_key, $app_name, 'PROD', $http_client);
        $license_response = $adobe_stock_client->getContentLicense($license_request, $access_token);
        # get remaining quota
        $quota = $license_response->available_entitlement->quota;
        # get purchase state (should be 'just_purchased')
        $state = $license_response->getContents()[$license_request->getContentId()]->getPurchaseDetails()->state;
        printf("This asset is %s, and your quota is %s.\n", $state, $quota);
    } catch (\Throwable $e) {
        var_dump($e->getMessage());
    }
 * =============
*/


# Get download URL
# (getting URL does not trigger a new license)
echo "\nGetting download URL...\n";
try {
    $url_request = new LicenseRequest();
    $url_request->setLicenseState('STANDARD');
    $url_request->setContentId($media_id);
    $adobe_stock_client = new AdobeStock($api_key, $app_name, 'PROD', $http_client);
    $url_response = $adobe_stock_client->downloadAssetUrl($url_request, $access_token);
    printf("Signed URL to download:\n%s\n", $url_response);
} catch (\Throwable $e) {
    var_dump($e->getMessage());
}


# Download image to file
# first gets url and then downloads asset via a new Guzzle client
echo "\nDownloading asset...\n";
try {
    $file_request = new LicenseRequest();
    $file_request->setLicenseState('STANDARD');
    $file_request->setContentId($media_id);
    $adobe_stock_client = new AdobeStock($api_key, $app_name, 'PROD', $http_client);
    $file_response = $adobe_stock_client->downloadAssetRequest($file_request, $access_token);
    # extract file name and URL from Guzzle object response
    $uri = $file_response->getUri();
    # if original file name is available, get it from query params
    $file_name = getFilename($uri->getQuery(), $uri->getPath());
    $file_url = $uri->getScheme() . '://' . $uri->getHost() . $uri->getPath() . '?' . $uri->getQuery();
    $download_client = new Client();
    # use sink option to download to file: http://docs.guzzlephp.org/en/stable/request-options.html#sink
    $download_client->get($file_url, [
        'sink' => $file_name,
    ]);
    printf("Asset downloaded to %s!\n", $file_name);
} catch (\Throwable $e) {
    var_dump($e->getMessage());
}

# extracts Stock filename if it exists in download URL, else returns path name
function getFilename($url, $path)
{
    # ex: response-content-disposition=attachment%3B%20filename%3D%22AdobeStock_112670342.jpeg%
    $query_re = '/filename.+?(AdobeStock_\d+\.\w+)(?:%|\'|")/';
    if (preg_match($query_re, $url, $matches) && $matches[1] !== null) {
        $name = $matches[1];
    } else {
        # strip leading slash if exists
        if (strpos($path, '/') === 0) {
            $name = substr($path, 1);
        } else {
            $name = $path;
        }
    };
    return $name;
}


# Get License History
# Request/response similar to Search API
$lh_limit = 3;
$lh_result_cols = Constants::getResultColumns();
$lh_params = new SearchParamLicenseHistory();
$lh_params->setLimit($lh_limit);

# get 240px thumbnail
$lh_result_cols_array = [
    $lh_result_cols['THUMBNAIL_240_URL'],
];

$lh_request = new LicenseHistoryRequest();
$lh_request->setLocale('en_US');
$lh_request->setSearchParams($lh_params);
$lh_request->setResultColumns($lh_result_cols_array);
$adobe_stock_client = new AdobeStock($api_key, $app_name, 'PROD', $http_client);
$lh_response = $adobe_stock_client->initializeLicenseHistory($lh_request, $access_token)->getNextLicenseHistory();

# get number of results
$lh_total = $lh_response->getNbResults();
printf("Found %d results\n", $lh_total);
printf("Displaying first %s results\n", $lh_limit);

# utility function to parse license history results
function displayResults($response_files)
{
    for ($idx = 0; $idx < count($response_files); $idx++) {
        $id = $response_files[$idx]->id;
        $date = $response_files[$idx]->license_date;
        $url = $response_files[$idx]->thumbnail_240_url;
        # print id, title and thumbnail URL for each result
        printf("[%s] : Licensed on %s\nPreview: %s\n", $id, $date, $url);
    }
}

# get files array from search and iterate over results
displayResults($lh_response->getFiles());

# display next page of results
if ($lh_total > $lh_limit) {
    echo "\nDisplaying next $lh_limit results.\n";
    # getting second page of results
    $adobe_stock_client = new AdobeStock($api_key, $app_name, 'PROD', $http_client);
    $lh_response = $adobe_stock_client->initializeLicenseHistory($lh_request, $access_token)->getLicenseHistoryPage(1);
    displayResults($lh_response->getFiles());
}
