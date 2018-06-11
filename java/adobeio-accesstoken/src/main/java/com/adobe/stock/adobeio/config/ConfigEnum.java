/**
 * Constants used to reference properties in config.properties
 * https://www.mkyong.com/java/java-enum-example/ 
*/

package com.adobe.stock.adobeio.config;

public enum ConfigEnum {
	DOMAIN("domain"),
	ORGID("orgId"),
	APIKEY("apiKey"),
	CLIENTSECRET("clientSecret"),
	TECHACCT("techAcct"),
	PRIVKEYFILENAME("privKeyFilename"),
	ENVIRONMENT("environment"),
	PRODUCT("product"),
	SCOPES("scopes"),
	IMSHOST("imsHost");
	
	private String prop;
	
	private ConfigEnum(final String value) {
        this.prop = value;
    }
	
	public String prop() {
		return prop;
	}
}
