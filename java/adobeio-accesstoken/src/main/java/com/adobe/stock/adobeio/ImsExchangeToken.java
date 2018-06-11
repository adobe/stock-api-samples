/**
 * https://www.journaldev.com/7148/java-httpurlconnection-example-java-http-request-get-post
 * https://www.journaldev.com/2324/jackson-json-java-parser-api-example-tutorial
 */

package com.adobe.stock.adobeio;

import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.MalformedURLException;
import java.net.URL;

import javax.net.ssl.HttpsURLConnection;

import com.adobe.stock.adobeio.config.AppConfig;
import com.adobe.stock.adobeio.ImsToken;
import com.fasterxml.jackson.databind.ObjectMapper;

public class ImsExchangeToken {
	private static String imsTokenEndpoint = "/ims/exchange/jwt";

	public static String getAccessToken(String jwtToken, AppConfig config) throws MalformedURLException, IOException {
		// for Charles proxying
		/*String certificatesTrustStorePath = System.getenv("JAVA_HOME") + "/jre/lib/security/cacerts";
		System.setProperty("javax.net.ssl.trustStore", certificatesTrustStorePath);
		System.setProperty("javax.net.ssl.trustStorePassword", "changeit");
		System.setProperty("https.proxyHost", "127.0.0.1");
		System.setProperty("https.proxyPort", "8888");*/
		
		String accessToken = "";
		String imsHost = config.imsHost;
		String apiKey = config.apiKey;
		String secret = config.clientSecret;
		String postParams = String.format("client_id=%s&client_secret=%s&jwt_token=%s", apiKey, secret, jwtToken);
		URL url = new URL("https://" + imsHost + imsTokenEndpoint);
		HttpsURLConnection req = (HttpsURLConnection) url.openConnection();
		byte[] postBytes = postParams.getBytes();
		req.setRequestMethod("POST");
		req.setDoOutput(true);
		req.setRequestProperty("Content-Type", "application/x-www-form-urlencoded"); 
		req.setRequestProperty("charset", "utf-8");
		req.setRequestProperty("Content-Length", Integer.toString(postBytes.length));
		DataOutputStream os = new DataOutputStream(req.getOutputStream());
		os.write(postBytes);
		os.flush();
		os.close();
		
		int responseCode = req.getResponseCode();
		// System.out.println("POST response code :: " + responseCode);
		
		if (responseCode == HttpsURLConnection.HTTP_OK) {
			BufferedReader in = new BufferedReader(new InputStreamReader(req.getInputStream()));
			String inputLine;
			StringBuffer response = new StringBuffer();
			while ((inputLine = in.readLine()) != null) {
				response.append(inputLine);
			}
			in.close();
			
			// parse JSON response using Jackson
			// data is mapped to ImsToken class
			ObjectMapper om = new ObjectMapper();
				ImsToken token = om.readValue(response.toString(), ImsToken.class);
				accessToken = token.access_token;
				// System.out.println("Access token: \n" + accessToken);
		} else { // get error message
			BufferedReader in = new BufferedReader(new InputStreamReader(req.getErrorStream(), "UTF-8"));
		    String msg = in.readLine();
		    in.close();
			System.out.println("POST failed :: " + msg);
		}
		return accessToken;
	}
	
}
