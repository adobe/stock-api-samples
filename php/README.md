# PHP SDK sample code

Here are some quickstart examples for working with the PHP SDK. For full SDK documentation and repositories, see [Adobe Stock SDKs](https://github.com/adobe/stock-api-sdk).

If you have not already read the API documentation, you must begin here to find out how to register your integration and learn the basics:
https://www.adobe.io/apis/creativecloud/stock/docs/getting-started.html

## Install the examples
Use Git to clone the entire repository in the [root folder](./stock-api-samples), or export a zip of the repository and extract locally. For this section, you will only need the `/php` folder.

1. The code samples include a copy of the PHP SDK. For now, _use the copy included with this repository_, rather than the original. The copy of the SDK is found in `/php/libs/stock-api-libphp`.
    - The SDK requires PHP 7.1 or higher. If you do not have that version, install it now.
    - The SDK requires [ImageMagick](https://www.imagemagick.org/) be installed on your system, and you will need the ImageMagick PHP extension as well. Once installed, this command should print a "1," assuming you have added PHP to your global PATH: `php -r "print(class_exists('imagick'));"`
      + On a Mac, you can install this with homebrew using `brew install homebrew/php/php71-imagick`. 
      + On Windows, it is a little trickier. Refer to [this article](https://mlocati.github.io/articles/php-windows-imagick.html)
      + If ImageMagick is not installed, then it will only affect the similarity (visual) search method of uploading an image. If you don't need this functionality, then you don't need to install it, but you will get warnings from Composer.

2. If it isn't already installed, install [Composer](https://getcomposer.org/download/). This is required to download project dependencies for the sample files and the SDK.
   - For Mac, recommend Homebrew for this: `brew install composer`.
     + If you get a message that the lock file is out of date, run `brew update composer`.
   - For Windows, Scoop is similar to Homebrew.
     + Open a PowerShell window.
     + Run `iex (new-object net.webclient).downloadstring('https://get.scoop.sh')` to download and install Scoop into your /Users/_username_ folder.
     + Install composer: `scoop install composer`

3. Install the sample code.
   - Change to the php directory and run this command: `composer install --no-dev`
   - This will install all non-developer dependencies for the sample code. If you choose to install those extra dependencies, you must also install [xdebug](https://xdebug.org/) separately.
   - This action will also install a copy of the SDK under the /vendor folder. 

## Configure your demo app
If you only need to use the PHP SDK for search, then you only need to add your API key and application name to the AppConfig file (see below). However, to use the licensing APIs, you will need to follow all steps.

### Generate a private key and public certificate
If you are going to use any of the licensing APIs, you will need a private key/public certificate. This is detailed in the [Service Account workflow guide](https://www.adobe.io/content/dam/udp/assets/StockAPI/Service-Account-API-workflow.pdf). For the sample code, you only need the private key, but it must match the public cert that you uploaded to Adobe.io to create the service account integration.

This command will generate both files using [OpenSSL](https://www.openssl.org/):
```
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -keyout myPrivate.key -out myPublic.crt
```

Now copy at least the private key file to the `/src/Config` folder and take note of the key filename.

### Update the AppConfig.php file
Open `/src/Config/AppConfig.php` and fill in the fields using the client credentials you obtained from Adobe.io. Also, fill in the private key filename saved above.

You should update these fields (if using search only, then only update the first two fields). The IMS_SCOPE constant may not need to change; you can confirm the proper value in your app configuration at Adobe.io, by clicking the __JWT__ tab.

```
    const APP_NAME = 'MySampleApp/1.0';
    const API_KEY = 'your-api-key-here';

    const TECH_ACCT = 'your-tech-acct-guid@techacct.adobe.com';
    const ORG_ID = 'your-org-guid@your-org';
    const CLIENT_SECRET = 'your-client-secret-here';
    const PRIV_KEYNAME = 'server_key.pem';
    const IMS_SCOPE = 'ent_stocksearch_sdk';
```

Leave the other fields as is.

## Test the samples
If you have PHP installed in your global PATH, it is easiest to run the samples from the command line.

Start in the `/php/src` directory and run the search example:

```shell
$ php sdk_search1.php

Found 324947 results
Displaying first 10 results
[75950374] : five kittens
https://as2.ftcdn.net/jpg/...jpg
[128412991] : kitten
https://as2.ftcdn.net/jpg/...jpg
[53119595] : beautiful cute little kitten meowing and smiling
https://as2.ftcdn.net/jpg/...jpg
[88469472] : Kittens in the box.
https://as2.ftcdn.net/jpg/...jpg
[66746658] : Kitten
https://as2.ftcdn.net/jpg/...jpg
[96789201] : kitten sleeps
https://as2.ftcdn.net/jpg/...jpg
[45147255] : Group of British shorthair and British longhair kittens
https://as2.ftcdn.net/jpg/...jpg
[64389309] : cute newborn kittens close up
https://as2.ftcdn.net/jpg/...jpg
[3397075] : kitten surprise
https://as2.ftcdn.net/jpg/...jpg
[86096187] : Cute orange tabby kitten with paw up, looking
https://as2.ftcdn.net/jpg/...jpg

Displaying next 10 results.
[80798359] : beautiful  kittens
https://as2.ftcdn.net/jpg/...jpg
[135322649] : Six in a basket
https://as2.ftcdn.net/jpg/...jpg
[66724934] : Kitten is playing with paper cranes
https://as2.ftcdn.net/jpg/...jpg
[84509847] : kitten
https://as2.ftcdn.net/jpg/...jpg
[40942634] : Cute orange kitten playing on a white background.
https://as2.ftcdn.net/jpg/...jpg
[35778457] : Funny kittens
https://as2.ftcdn.net/jpg/...jpg
[111122162] : Smiling Kitten Holding Blank Sign
https://as2.ftcdn.net/jpg/...jpg
[3267607] : kitten with red ball of yarn on white background
https://as2.ftcdn.net/jpg/...jpg
[89641568] : Kitten
https://as2.ftcdn.net/jpg/...jpg
[55143671] : Kitten in a basket with balls of yarn
https://as2.ftcdn.net/jpg/...jpg
```

And the license example:

```shell
$ php sdk_license1.php

Getting access token...
Access token request is successful.

Getting Content/Info...
Asset is purchased as of 2018-02-26 18:30:17.

Getting Member/Profile...
It is possible to license this item. This will use 1 of your 45 standard credits.

Getting Content/License...
This asset is purchased, and your quota is 45.

Getting download URL...
Signed URL to download:
https://stock-apex-images-prod...16dbe73

Downloading asset...Asset downloaded to AdobeStock_112670342.jpeg!

Found 5 results
Displaying first 3 results
[112670342] : Licensed on 2/26/18, 6:30 PM
Preview: https://t4.ftcdn.net/jpg/...9MqRF.jpg
[184691193] : Licensed on 2/26/18, 5:35 PM
Preview: https://t4.ftcdn.net/jpg/...9MqRF.jpg
[112670342] : Licensed on 11/6/17, 2:54 AM
Preview: https://t4.ftcdn.net/jpg/...9MqRF.jpg

Displaying next 3 results.
[5114904] : Licensed on 11/1/17, 11:00 PM
Preview: https://t4.ftcdn.net/jpg/...9MqRF.jpg
[62305369] : Licensed on 11/1/17, 10:57 PM
Preview: https://t4.ftcdn.net/jpg/...9MqRF.jpg
```

The output above will be different for the licensing example, but should be similar for the search example.

Both files should execute without errors if you have configured everything properly... Each SDK method is enclosed in a try/catch block, so look at the error. In most cases it will be that the AppConfig is not correct:

- Didn't fill in correct API key or other fields
- Private key name is invalid or private key missing, or does not match the cert associated with the app configuration on Adobe.io

Or missing dependencies (didn't run `composer install`), etc.

## Notes
All samples are annotated with comments, but email stockapis@adobe.com if you have questions, and refer to the [API docs](https://www.adobe.io/apis/creativecloud/stock/docs/getting-started.html) if in doubt.

The license example uses a demo class found in `/src/Utils/ImsToken.php` which is used to generate the access token from a service account. This functionality is not part of the SDK, so it was included here as a courtesy. It uses [firebase/jwt](https://github.com/firebase/php-jwt) to create the JSON web token, and [Guzzle 6](http://docs.guzzlephp.org/en/stable/) to fetch the token from IMS.

Guzzle is also required as part of the SDK, and is used in the license example to download the file.

### Troubleshooting
Installing all the dependencies can be tricky, especially on Windows. One issue that may occur is a curl error when you run any Guzzle client (Guzzle uses curl under the hood):

```
cURL error 60: SSL certificate problem: unable to get local issuer certificate
```

If this happens, download the CA bundle (`cacert.pem`) from https://curl.haxx.se/docs/caextract.html. Save it to a location on your hard drive (if using Scoop, recommend saving in your PHP path), and add this line to your `php.ini` with the file's absolute path:
```
;curl.cainfo = "\path\to\cacert.pem"
curl.cainfo = "C:\Users\myUser\scoop\apps\php\7.2.2\extras\ssl\cacert.pem"
```

If running a PHP server, restart the server before trying again.
