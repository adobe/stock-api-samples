# Stock Gallery Helper
Extension for Chrome to manage Stock galleries

This is sample code is a work in progress. 

## Usage

See the tutorial at https://adobe.ly/34aQ3po. This covers part of the installation except for the new step of adding your own API key and Gallery API endpoint--see Installation instructions below.

## Installation

Download everything in the `src` folder to a local drive, or expand the contents of the latest zip file.

**Important!** Before it is functional, you will need to update two lines in [`services.mjs`](src\background\services.mjs) located in `src/background`:

- Replace `{API KEY}` with your own Stock API key. You can get a free Adobe developer account and Adobe Stock API key using the [I/O Console](https://console.adobe.io/).
- Replace `{ENDPOINT URL HERE}` with the Gallery API endpoint URL. This will be provided by the Stock team: [stockapis@adobe.com](mailto:stockapis@adobe.com?subject=%5BAdobe%20I%2FO%5D%20Galleries%20API).

In an update, this step will be replaced by an options dialog box in the extension.

```javascript
  URL: {
    PROD: '{ENDPOINT URL HERE}',
  },
  // returns pagination parameters
  PAGE_PARAMS: (l, p) => `?limit=${l}&page=${p}`,
  SETID: (id) => `/${id}`,
  HEADERS: (env, token) => {
    const key = {
      PROD: '{API KEY}',
    };
```

If you have questions about the API or the sample code, please contact [stockapis@adobe.com](mailto:stockapis@adobe.com?subject=%5BAdobe%20I%2FO%5D%20Galleries%20API).

## Contributing

Contributions are welcomed! Read the [Contributing Guide](https://github.com/adobe/stock-api-samples/blob/master/CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](https://github.com/adobe/stock-api-samples/blob/master/LICENSE) for more information.
