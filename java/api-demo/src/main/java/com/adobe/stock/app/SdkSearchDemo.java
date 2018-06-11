package com.adobe.stock.app;

import java.util.ArrayList;
import java.util.Random;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import com.adobe.stock.adobeio.ImsGetAccessToken;
import com.adobe.stock.adobeio.config.AppConfig;
import com.adobe.stock.apis.SearchFiles;
import com.adobe.stock.config.StockConfig;
import com.adobe.stock.enums.AssetOrientation;
import com.adobe.stock.enums.AssetType;
import com.adobe.stock.enums.Environment;
import com.adobe.stock.enums.ResultColumn;
import com.adobe.stock.models.SearchFilesRequest;
import com.adobe.stock.models.SearchFilesResponse;
import com.adobe.stock.models.SearchParameters;
import com.adobe.stock.models.StockFile;

public class SdkSearchDemo {

	private static final Logger logger = LogManager.getLogger(SdkSearchDemo.class.getName());
	private static String resourcePath = ""; // default path is src/main/resources
	private static String configName;

	/**
	 * Requires Stock API SDK (stockapissdk) and Adobe IO token
	 * (adobeio-accesstoken)
	 * 
	 * @param args
	 */
	public static void main(String[] args) {

		configName = "ProdConfig.properties"; // default config
		if (args.length > 0) {
			configName = args[0];
		}
		try {
			// create config from values stored in resources/NAME.properties
			String configPath = String.format("%s/%s", resourcePath, configName);
			AppConfig config = new AppConfig(configPath);

			// set app properties
			String apiKey = config.apiKey;
			String product = config.product;
			Environment env = (config.environment.equals("prod")) ? Environment.PROD : Environment.STAGE;

			// get access token: this is optional for search, but used to get license status
			String token = ImsGetAccessToken.getToken(configName);
			logger.info("token: " + token);

			// create Stock config object
			StockConfig searchConfig = new StockConfig()
					.setApiKey(apiKey)
					.setProduct(product)
					.setTargetEnvironment(env);

			// create search params and filters and limit to 10 results
			SearchParameters params = new SearchParameters()
					.setWords("kittens")
					.setLimit(5);

			// optional: restrict response to certain fields
			ResultColumn[] resultColumns = { 
					ResultColumn.NB_RESULTS, 
					ResultColumn.ID, 
					ResultColumn.TITLE 
			};

			// create search request
			SearchFilesRequest searchReq = new SearchFilesRequest()
					.setLocale("en_US")
					.setSearchParams(params)
					.setResultColumns(resultColumns);

			// create search object with request and config (access token defaults to null)
			SearchFiles search = new SearchFiles(searchConfig, token, searchReq);

			// execute request and store results
			// response is type SearchFilesResponse
			// getNextResponse will fetch first page of results (including total number)
			SearchFilesResponse response = search.getNextResponse();
			
			// display number of results
			logger.info("Results: " + response.getNbResults());
			
			// loop over results and display
			showSearchResults(response.getFiles());
			
			// display next page of results
			logger.info("..........Getting next page");
			response = search.getResponsePage(1);
			showSearchResults(response.getFiles());
			
			// to get all pages, divide total results / number per page, then loop over page numbers starting with 0
			// Example
			/*
				params = new SearchParameters()
						.setWords("angry kittens")
						.setLimit(20); // 32 is the default number of items per page, max of 64
				searchReq = new SearchFilesRequest()
						.setLocale("en_US")
						.setSearchParams(params)
						.setResultColumns(resultColumns);
				search = new SearchFiles(searchConfig, token, searchReq);
			    int responseTotal = response.getNbResults();
			    int numPages = responseTotal / 20 + ((responseTotal % 20 == 0) ? 0 : 1); 
			    logger.info(numPages + " pages found.");
			    for (int idx = 0; idx < numPages; idx++) {
			        logger.info("-------Results page " + idx);
			    	response = search.getResponsePage(idx);
			        showSearchResults1(response.getFiles());
			    }
			*/
			
			// get license state, multiple preview sizes, multiple metadata fields
			params = new SearchParameters()
					.setWords("hd")
					.setLimit(10);
			ResultColumn[] resultColumnsExt = { 
					ResultColumn.NB_RESULTS, 
					ResultColumn.ID, 
					ResultColumn.TITLE,
					ResultColumn.WIDTH,
					ResultColumn.HEIGHT,
					ResultColumn.MEDIA_TYPE_ID,
					ResultColumn.CREATOR_NAME,
					ResultColumn.DETAILS_URL,
					ResultColumn.IS_LICENSED,
					ResultColumn.THUMBNAIL_240_URL,
					ResultColumn.THUMBNAIL_1000_URL,
					ResultColumn.VIDEO_PREVIEW_URL,
					ResultColumn.FRAMERATE,
					ResultColumn.DURATION
			};
			searchReq = new SearchFilesRequest()
					.setLocale("en_US")
					.setSearchParams(params)
					.setResultColumns(resultColumnsExt);
			search = new SearchFiles(searchConfig, token, searchReq);
			response = search.getNextResponse();
			showSearchResultsExt(response.getFiles());
			    
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}
	
	public static void showSearchResults(ArrayList<StockFile> files) {
		for (int idx = 0; idx < files.size(); idx ++) {
			StockFile item = files.get(idx);
			int id = item.getId();
			String title = item.getTitle();
			String line = String.format("#%s: %s", id, title);
			logger.info(line);
		}		
	}
	
	public static void showSearchResultsExt(ArrayList<StockFile> files) {
		logger.info("----------------");
		logger.info(String.format("%-10s %-9s %-14s %-8s %s", "Id", "Size", "Type", "Licensed", "Preview URL"));
		for (int idx = 0; idx < files.size(); idx ++) {
			StockFile item = files.get(idx);
			String url = (item.getVideoPreviewUrl() != null) ? item.getVideoPreviewUrl() : item.getThumbnail1000Url();
			String licensed = (item.getIsLicensed().toString().equals("")) ? "No" : "Yes";
			String line = String.format("%-10s %sx%s %-14s %-8s %s", item.getId(), item.getWidth(), item.getHeight(), item.getAssetTypeId().name(), licensed, url);
			logger.info(line);
		}
	}
	
}
