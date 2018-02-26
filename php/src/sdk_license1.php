#!/usr/bin/env php
<?php
error_reporting(-1); # show all errors

require __DIR__ . '/../vendor/autoload.php'; # composer class loader

# Stock API includes for licensing

# Config class in config folder with app constants
# ImsToken class generates access token for service account
use \SdkDemo\Utils\ImsToken;
use \SdkDemo\Config\AppConfig;
use \AdobeStock\Api\Client\Http\HttpClient;
use \AdobeStock\Api\Client\AdobeStock;
use \AdobeStock\Api\Request\License as LicenseRequest;
use \AdobeStock\Api\Response\License as LicenseResponse;

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
$adobe_stock_client = new AdobeStock($api_key, $app_name, 'PROD', $http_client);

$media_id = 112670342;

# Check if asset #112670342 is already licensed
# call Content/Info
echo "\nGetting Content/Info...\n";
$info_request = new LicenseRequest();
$info_request->setLocale('en_US');
$info_request->setLicenseState('STANDARD');
$info_request->setContentId($media_id);
$info_response = $adobe_stock_client->getContentInfo($info_request, $access_token);
$purchase_details = $info_response->getContents()[$info_request->getContentId()]->getPurchaseDetails();
$state = $purchase_details->state;
$date_purchased = $purchase_details->date;
printf("Asset is %s as of %s.\n", $state, $date_purchased);

# Get profile info for asset
# call Member/Profile to get quota and status of media
# (State will be 'possible' even if already licensed)
echo "\nGetting Member/Profile...\n";
$profile_request = new LicenseRequest();
$profile_request->setLocale('en_US');
$profile_request->setLicenseState('STANDARD');
$profile_request->setContentId($media_id);
$profile_response = $adobe_stock_client->getMemberProfile($profile_request, $access_token);
# get quota available for this type of asset
$quota = $profile_response->available_entitlement->quota;
# check if licensing is possible and get message
$state = $profile_response->purchase_options->state;
$message = $profile_response->purchase_options->message;
printf("It is %s to license this item. %s\n", $state, $message);

# Get license for asset
# (if asset is already licensed it will not be licensed again without license_again flag)
echo "\nGetting Content/License...\n";
$license_request = new LicenseRequest();
$license_request->setLocale('en_US');
$license_request->setLicenseState('STANDARD');
$license_request->setContentId($media_id);
$license_response = $adobe_stock_client->getContentLicense($license_request, $access_token);
# get remaining quota
$quota = $license_response->available_entitlement->quota;
# get purchase state
$state = $license_response->getContents()[$license_request->getContentId()]->getPurchaseDetails()->state;
printf("This asset is %s, and your quota is %s.\n", $state, $quota);

# Get download URL
# (Getting URL does not trigger a new license)
echo "\nGetting download URL...\n";
$down_request = new LicenseRequest();
$down_request->setLicenseState('STANDARD');
$down_request->setContentId($media_id);
$down_response = $adobe_stock_client->downloadAssetUrl($down_request, $access_token);
printf("Signed URL to download:\n%s", $down_response);

// TO DO: Add license history example
// TO DO: Try to figure out how to add 'license_again' flag
