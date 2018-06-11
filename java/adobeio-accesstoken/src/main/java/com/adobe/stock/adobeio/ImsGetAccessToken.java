/**
 * Utility class to generate a JWT and exchange for IMS access token
 */
package com.adobe.stock.adobeio;

import com.adobe.stock.adobeio.config.AppConfig;
import com.adobe.stock.adobeio.ImsExchangeToken;
import com.adobe.stock.adobeio.ImsJwtToken;


/**
 * @author cfsmith@adobe.com
 *
 */
public class ImsGetAccessToken {

	private static String resourcePath = ""; // default path is src/main/resources
	private static String configName;
	
	/**
	 * @param args
	 */
	public static void main(String[] args) {
		// process parameters
		configName = "ProdConfig.properties"; // default config 
		if (args.length > 0) {
			configName = args[0];
		}
		getToken(configName);
	}
	
	public static String getToken(String configName) {
		String token = "";
		
		try {
			// create config from values stored in resources/NAME.properties
			String configPath = String.format("%s/%s", resourcePath, configName);
			AppConfig config = new AppConfig(configPath);
			
			// create JWT
			String jwt = ImsJwtToken.getJwt(config);
			// System.out.println("JWT: \n" + jwt);
			
			// exchange JWT for access token
			token = ImsExchangeToken.getAccessToken(jwt, config);
			System.out.println("Access token: \n" + token);

		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}

		return token;
	}

}
