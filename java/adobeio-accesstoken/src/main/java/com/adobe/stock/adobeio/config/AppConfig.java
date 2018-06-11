/**
 * Stores specific properties for Stock API app
 */
package com.adobe.stock.adobeio.config;

import com.adobe.stock.adobeio.config.ConfigEnum;
import com.adobe.stock.adobeio.config.PropMapper;

public class AppConfig {
	public String domain;
	public String orgId;
	public String apiKey;
	public String clientSecret;
	public String techAcct;
	public String privKeyFilename;
	public String environment;
	public String product;
	public String[] scopes;
	public String imsHost;
	
	public AppConfig (String configPath) {
		// create properties object from file
		PropMapper props = new PropMapper(configPath);
		// add properties as public members of this class
	    domain          = props.getProperty(ConfigEnum.DOMAIN.prop());
	    orgId           = props.getProperty(ConfigEnum.ORGID.prop());
	    apiKey          = props.getProperty(ConfigEnum.APIKEY.prop());
	    clientSecret    = props.getProperty(ConfigEnum.CLIENTSECRET.prop());
	    techAcct        = props.getProperty(ConfigEnum.TECHACCT.prop());
	    privKeyFilename = props.getProperty(ConfigEnum.PRIVKEYFILENAME.prop());
	    environment     = props.getProperty(ConfigEnum.ENVIRONMENT.prop());
	    product         = props.getProperty(ConfigEnum.PRODUCT.prop());
	    // scopes are a comma-separated list
	    scopes          = props.getProperty(ConfigEnum.SCOPES.prop()).split(",");
	    imsHost         = props.getProperty(ConfigEnum.IMSHOST.prop());
	}
}
