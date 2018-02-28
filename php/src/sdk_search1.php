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

# Stock API includes for search
use \AdobeStock\Api\Client\AdobeStock;
use \AdobeStock\Api\Client\Http\HttpClient;
use \AdobeStock\Api\Request\SearchFiles;
use \AdobeStock\Api\Core\Constants;
use \AdobeStock\Api\Models\SearchParameters;

# Config class in config folder with app constants
use \SdkDemo\Config\AppConfig;

# for normal search, only api key and app name are required
$config = new AppConfig();
$api_key = $config::API_KEY;
$app_name = $config::APP_NAME;

# create new search request
$request = new SearchFiles();
$request->setLocale('en_US');

# create search filters and limit to 10 results
$search_params = new SearchParameters();
$search_params->setWords('kittens');
$search_params->setLimit(10);
# add search filters to request
$request->setSearchParams($search_params);

# optionally: restrict response to certain fields
$results_columns = Constants::getResultColumns();
$result_column_array = [
    $results_columns['NB_RESULTS'],
    $results_columns['TITLE'],
    $results_columns['ID'],
    $results_columns['THUMBNAIL_URL'],
];
# add result fields to request
$request->setResultColumns($result_column_array);

# create API client
$http_client = new HttpClient();
$adobe_stock_client = new AdobeStock($api_key, $app_name, 'PROD', $http_client);

# execute request and store results (second param is optional access token)
# response is type SearchFilesResponse (\AdobeStock\Api\Response\SearchFiles)
# getNextResponse will fetch first page of results (including total number)
$response = $adobe_stock_client->searchFilesInitialize($request, '')->getNextResponse();

# get number of results
$response_total = $response->getNbResults();
printf("Found %d results\n", $response_total);
echo "Displaying first 10 results\n";

# utility function to parse results
function displayResults($response_files)
{
    for ($idx = 0; $idx < count($response_files); $idx++) {
        $id = $response_files[$idx]->id;
        $title = $response_files[$idx]->title;
        $url = $response_files[$idx]->thumbnail_url;
        # print id, title and thumbnail URL for each result
        printf("[%s] : %s\n%s\n", $id, $title, $url);
    }
}

# get files array from search and iterate over results
displayResults($response->getFiles());

# display next page of results
if ($response_total > 10) {
    echo "\nDisplaying next 10 results.\n";
    # getting second page of results
    $response = $adobe_stock_client->searchFilesInitialize($request, '')->getResponsePage(1);
    displayResults($response->getFiles());
}

# to get all pages, divide total results / number per page, then loop over page numbers starting with 0
# each page can have a limit up to 64 items per page
# Example
/*
    $response_total = $response->getNbResults();
    $num_pages = ceil($response_total) / 32; // 32 is the default number of items per page
    for ($idx = 0; $idx < $num_pages; $idx++) {
        $response = $adobe_stock_client->searchFilesInitialize($request, '')->getResponsePage($idx);
        displayResults($response->getFiles());
    }
*/
