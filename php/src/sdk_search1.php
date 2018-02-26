#!/usr/bin/env php
<?php
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

if ($response_total > 10) {
    echo "\nDisplaying next 10 results.\n";
    # getting second page of results
    $response = $adobe_stock_client->searchFilesInitialize($request, '')->getResponsePage(1);
    displayResults($response->getFiles());
}
