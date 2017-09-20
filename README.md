# WARNING: DEV PRE-RELEASE
This module is not released or complete and should not be used until this message isn't here. It will be available via GitHub and NPM when it reaches v1.0.0 release status.

# FedEx Cross Border API

This node module acts as a wrapper for the FedEx Cross Border API, allowing your node applications to consume v4.4 of the SOAP API and perform tasks for fulfilling international shipping for FedEx Cross Border customers.

It features a synchronous client that functions with traditional node style callbacks, and an asynchronous client that uses ECMA 6 style promises. All of the Connect API methods are supported as of release v1.0.0, and details (as well as where objects differ in structure from official FECB docs) are listed below.

## Purpose

Traditionally, FECB is integrated entirely on the ecommerce platform it is supporting as a fulfillment method. If your cart platform is running on node already, great! This software will provide a quick integration for you. 

However, most common ecommerce platforms run on PHP, .net, or Java. Leaving aside the issues with these languages, of these three, only .net provides a suitably performant XML parser, and all three languages have their own issues about sharing server resources with external SOAP APIs. To avoid adding overhead that can nick your server response times or scalability, you may wish to use an external application to handle the majority of the FECB API work, and node is pretty performant in handling an XML workflow, and even *\*shudder\** SOAP.

This wrapper will allow you to build an application to do all the FECB dirty work and interact with your ecommerce platform in a native, hopefully more performant manner than acting as a SOAP client on your server.

## Installation

v.1.0.0 is available as an NPM package:

```bash
npm install fedex-cross-border-api
```

## Basic Usage

Once installed locally or globally, require the module:

```javascript
var FedExCrossBorder = require('fedex-cross-border-api');
```

To instantiate a client, you'll need a minimum of two arguments passed to the args object of either clients' constructor: a two letter language code (only english and spanish are currently supported by FECB API v4.4) and the merchant key for your FECB account:

```javascript
var language = 'en';
var merchantKey = 'yourMerchantKeyForFECB';
var args = {
	"language": language,
	"merchantKey": merchantKey
};
```

Then you may create either a synchronous client:

```javascript
var fecbClientSync = new FedExCrossBorder.client(args);
```

Or an asynchronous client:

```javascript
var fecbClientAsync = new FedExCrossBorder.clientAsync(args);
```

Calling a method on the client is pretty straightforward; client methods match the method names in the FECB docs and WSDL file, and your request data is passed in an object as the first argument for each (details for each method/object below). Sync client methods return values via node 'standard' two argument callbacks, and Async client methods, when assigned to a variable, are promises that return data from the API on success. Here's an example of each using the 'ConnectProductInfo':

```javascript
// lets assume we've already created objects for each product here...
var productInfoArray = [
	productObject1,
	productObject2
];

// synchronous call to method
// we'll log the results to console
fecbClientSync.ConnectProductInfo(productInfoArray, function(error, result) {

	if (error) {
		console.log("Oh no! \n" + error.message);
	}
	
	else {
		console.log("Yay, we got stuff! \n" + JSON.stringify(result));
	}

});

// asynchronous call to method
// we'll log results to console when promise is resolved or rejected
var sendProductInfo = fecbClientAsync.ConnectProductInfo(productInfoArray);
sendProductInfo.then(function(result) {

	console.log("Yay, we got stuff! \n" + JSON.stringify(result));

}).catch((error) => {

	console.log("Oh no! \n" + error.message);

});
```

## Client Constructors

Each constructor's first argument is an object containing properties that define the behavior of the client during method calls. The synchronous client also requires a second argument, the callback function. The 'args' object, as mentioned in the previous section, always requires a 'merchantKey' and a 'language' property. Both are ECMA 6 compliant 'classes' (basically prototypes with class-like syntax), so they are instantiated using the 'new' keyword, with constructor arguments after the class name. Full explanation of the usage for each constructor:

### Synchronous Client Constructor

##### Function

client(args(object))

##### Returns

FedExCBClient

##### Valid Properties for 'args'

property | valueType | notes
:--- | :--- | :---
language | string(2) | v4.4 supports 'en' or 'es'
merchantKey | string(45) | value provided by FECB
stripWrapper | boolean | default false
returnRaw | boolean | default false; only acknowledged if stripWrapper is false
returnSoapHeader | boolean | default false; only acknowledged if stripWrapper is false




### Asynchronous Client Constructor

##### Function

clientAsync(args(object))

##### Returns

FedExCBClientAsync Object

##### Valid Properties for 'args'

property | valueType | notes
:--- | :--- | :---
language | string(2) | required, v4.4 supports 'en' or 'es'
merchantKey | string(45) | required, value provided by FECB
stripWrapper | boolean | default false
returnRaw | boolean | default false; only acknowledged if stripWrapper is false
returnSoapHeader | boolean | default false; only acknowledged if stripWrapper is false

### Optional Arguments of 'args' for both Constructors

In addition to the the required 'language' and 'merchantKey' properties, the argument object for the client constructors also accepts some optional properties, noted above. These affect how the client's methods return the successful response. 

By default, methods return a result object that contains a single property, response. This property is an object parsed from the server's response to the API call. 

For debugging or other logical purposes, the soapHeader or the raw response string can be added to the result object of all methods by setting the 'returnSoapHeader' and/or 'returnRaw' arguments to true, respctively. Setting 'returnSoapHeader' to true adds the 'soapHeader' property to the result object, which contains the soapHeader of the API response. Setting 'returnRaw' to true adds the 'raw' property to the result object, which contains the soapHeader of the API response. Both of these are IN ADDITION to the 'response' property, which is always returned.

But, if you'd like to go in the opposite direction and return ONLY the response property, without a wrapper, setting the 'stripWrapper' property of 'args' to true will only return the 'response' object without another object wrapping it. This option also disables the effects of 'returnRaw' and 'returnSoapHeader'.

Examples focus on the Sync client, but the same rules apply for Async as well... except the result is an argument of your promise success handler rather than of the callback.

##### Examples

```javascript
var FedExCrossBorder = require('fedex-cross-border-api');
var args1 = {
	"language": "en",
	"merchantKey": "***myMerchantKeyValue***"
};
var args2 = {
	"language": "en",
	"merchantKey": "***myMerchantKeyValue***",
	"stripWrapper": true
	// if returnRaw and/or returnSoapHeader are set to true here,
	// they will be ignored
};
var args3 = {
	"language": "en",
	"merchantKey": "***myMerchantKeyValue***",
	// stripWrapper defaults to false
	"returnRaw": true
};
var args4 = {
	"language": "en",
	"merchantKey": "***myMerchantKeyValue***",
	// stripWrapper defaults to false
	"returnSoapHeader": true
};

var fecbClientDefault = new FedExCrossBorder.client(args1);
// methods for this client will return a result object like this:
// {
// 	    response: {
//                 statusCode: 200,
//                 body: 'your results etc etc'
//                 etc: etc...
//      }
// }

var fecbClientLean = new FedExCrossBorder.client(args2);
// methods for this client will only return the response object AS the result:
// {
//    statusCode: 200,
//    body: 'your results etc etc'
//    etc: etc...
// }

var fecbClientRaw = new FedExCrossBorder.client(args3);
// methods for this client will return a result object with both raw and response values:
// {
// 	    response: {
//                 statusCode: 200,
//                 body: 'your results etc etc'
//                 etc: etc...
//      },
// 	    raw: '<xml><statusCode>200</statusCode><body> 'your results etc etc'</body><etc>etc...</etc></xml>'
// }

var fecbClientHeaders = new FedExCrossBorder.client(args4);
// methods for this client will return a result object with both soapHeader and response values:
// {
// 	    response: {
//                 statusCode: 200,
//                 body: 'your results etc etc'
//                 etc: etc...
//      },
// 	    soapHeader: '<soap><really>probably useful but why</really><etc>etc...</etc></soap>'
// }

// IN CASE IT WASN'T OBVIOUS... these are not the actual values the API returns...
// Just illustrating the effects of the constructor args...

```

# BOILERPLATE FOR EACH METHOD

##### Arguments Passed to Callback

argument | valueType | notes
:--- | :--- | :---
error | object(JS Error or subclass thereof) | false if no error occurs
result | object | by default only has one property, response, which is the server's response parsed into a JS object

##### Arguments Passed to resolution function

argument | valueType | notes
:--- | :--- | :---
result | object | by default only has one property, response, which is the server's response parsed into a JS object

##### Arguments Passed to rejection function

argument | valueType | notes
:--- | :--- | :---
error | object(JS Error or subclass thereof) | false if no error occurs

## Methods

### ConnectProductInfo

### ConnectLandedCost

### ConnectOrder

### ConnectOrderTrackingUpdate

### ConnectOrderRemove

### ConnectSkuStatus

## Objects

Several classes are available to use, with built in validation and some santization as part of the constructor. These are used by the client methods internally, but are exposed for your use as well, if you need them.

### carton

### productInfo

## Functions

Utility functions used by the clients are also exposed for your use, should you need them.

### validateLanguage

### validateCountry

### validateCurrency

### getCountryForHub

## Constants

If the objects and functions aren't enough, the constants containing various FECB provided tables, as of API v4.4, (also listed in CSV format in the /csv directory of this package) are exposed for direct access, should you need them.

### exportHubs

### countryCodes

### languages