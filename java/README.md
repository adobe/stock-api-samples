# Java SDK sample code

Here are some quickstart examples for working with the Java SDK. For full SDK documentation and repositories, see [Adobe Stock SDKs](https://github.com/adobe/stock-api-sdk).

If you have not already read the API documentation, you must begin here to find out how to register your integration and learn the basics:
https://www.adobe.io/apis/creativecloud/stock/docs/getting-started.html

## Install the examples
Use Git to clone the entire repository in the [root folder](./stock-api-samples), or export a zip of the repository and extract locally. For this section, you will only need the `/java` folder.

1. If you haven't done so already, you'll need to install Java. The code examples were built with JDK 1.8, but JRE 1.8 should work as well unless you plan to distribute the examples in a JAR file.

    + Download: http://www.oracle.com/technetwork/java/javase/downloads/jre8-downloads-2133155.html
    + Installation tutorial: https://www3.ntu.edu.sg/home/ehchua/programming/howto/JDK_Howto.html

2. Both examples are set up as Maven projects. Install version 3.5.x.

    + Download: https://maven.apache.org/download.cgi
    + Installation tutorial: http://www.baeldung.com/install-maven-on-windows-linux-mac

3. Create required config files in `/{project}/src/main/resources`. See __Configure your demo app__ below.

4. The api-demo includes a built JAR of the Java SDK, as well as a JAR of the adobeio-accesstoken project, in the /libs folder. You will need to install these JARs from the command line, or you may receive build failures.

    + Open a terminal/command prompt at the api-demo root folder.
    + Run this command (assumes Java and Maven are installed):
```
mvn install:install-file -Dfile="libs/adobeio-accesstoken-0.0.1.jar" -Dfile="libs/stockapissdk-1.0.0.jar"
```

5. If running the adobeio-accesstoken project, go to its root folder and run this command:

```
mvn install
```

This can also be run from the api-demo root folder when updating resources.

## Configure your demo app
All test projects will need to be updated with your configuration data, or they will not work. All configuration files can be found in `/{project}/src/main/resources`.

### Generate a private key and public certificate
If you are going to use any of the licensing APIs, you will need a private key/public certificate. This is detailed in the [Service Account workflow guide](https://www.adobe.io/content/dam/udp/assets/StockAPI/Service-Account-API-workflow.pdf). For the sample code, you only need the private key, but it must match the public cert that you uploaded to Adobe.io to create the service account integration.

This command will generate both files using [OpenSSL](https://www.openssl.org/):
```
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout myPrivate.key -out myPublic.crt
```

There is one more step to make your private key work with the demo code. You will need to convert the .key in PEM format to a .der in PKCS8 format that can be read from Java. 

```
openssl pkcs8 -topk8 -inform PEM -outform DER -in myPrivate.key  -nocrypt > myPrivate.der
```

This tip came from https://stackoverflow.com/a/7473874. 

Now copy at least the private key file to the `/{project}/src/main/resources` folder and take note of the key filename.

### Update the ProdConfig.properties file
Open `/{project}/src/main/resources` and rename `ProdConfig.properties.txt` as `ProdConfig.properties`.

Open the file in a text editor and fill in the fields using the client credentials you obtained from Adobe.io. Also, fill in the private key filename saved above.

You should update these fields. The IMS_SCOPE constant may not need to change; you can confirm the proper value in your app configuration at Adobe.io, by clicking the __JWT__ tab.

```
    orgId=your-org-guid@your-org
    apiKey=your-api-key-here
    clientSecret=your-client-secret-here
    techAcct=your-tech-acct-gui@techacct.adobe.com
    privKeyFilename=server-key.der
    product=MySampleApp/1.0
    scopes=ent_stocksearch_sdk
```

Save the file and leave in `/{project}/src/main/resources`.

You may need to run a Maven install after creating these files, or they may be included automatically by your IDE. If they don't appear in `/target/classes` you will likely receive runtime errors. You can either copy them manually, or see step 5 above.

## Using the samples

As documented above, neither example will work until you have completed the configuration process. In addition, both main classes take one optional argument, which is the name of the properties file. The default is `ProdConfig.properties` and it is assumed to reside in the `/src/main/resources` folder.

### API demo
The main sample is api-demo. It currently contains one main class, `com.adobe.stock.app.SdkSearchDemo`. This has sample SDK search requests with different parameters. Documentation for the SDK and APIs can be found at https://www.adobe.io/apis/creativecloud/stock/docs/getting-started.html and https://github.com/adobe/stock-api-libjava. 

The code also includes a search request that implements paging, but is commented out because it would execute many consecutive requests; if you run it, stop it after a few pages are returned.

The samples are dependent on the Java SDK and the other sample project, adobeio-accesstoken, which are bundled as JARs in the /libs folder. The adobeio-accesstoken project can be used on its own, or in this case it is used to generate an IMS access token from a service account.

### Adobe I/O access token
As mentioned above, this generates an Adobe IMS access token from a service account by generating and exchanging a signed JWT with the IMS service. It is not dependent on the Java SDK. It can be used on its own for this purpose.

The main class for this project is `com.adobe.stock.adobeio.ImsGetAccessToken`.

## Notes
All samples are annotated with comments, but email stockapis@adobe.com if you have questions, and refer to the [API docs](https://www.adobe.io/apis/creativecloud/stock/docs/getting-started.html) if in doubt.

If you have having problems building or running the project--good luck! (And use Google.) I find Java temperamental, and the environment must be configured properly. Unless you are experienced with Java and Maven projects, I recommend using the SDK for PHP or JavaScript as the setup is far simpler.
