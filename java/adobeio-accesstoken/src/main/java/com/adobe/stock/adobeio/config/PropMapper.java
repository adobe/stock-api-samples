/**
 * Gets key/value pairs from properties file and returns generic Properties object
 */

package com.adobe.stock.adobeio.config;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Properties;

public class PropMapper extends Properties {
	
	private static final long serialVersionUID = 001L; // implements Serializable
	
	public PropMapper(String name) {
		try {
			String rootPath = this.getClass().getResource("/").getPath();
			String configPath = rootPath + name;
			// create Properties instance and load values
			super.load(new FileInputStream(configPath));
		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
}
