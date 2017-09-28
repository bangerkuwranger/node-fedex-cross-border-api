# WARNING: DEV PRE-RELEASE
This module is not released or complete and should not be used until this message isn't here. It will be available via GitHub and NPM when it reaches v1.0.0 release status.

# FedEx Cross Border API

This node module acts as a wrapper for the FedEx Cross Border API, allowing your node applications to consume v4.4 of the SOAP API and perform tasks for fulfilling international shipping for FedEx Cross Border customers.

It features client that functions with traditional node style callbacks, and client that uses ECMA 6 style promises. All of the Connect API methods are supported as of release v1.0.0, and details (as well as where objects differ in structure from official FECB docs) are listed below.

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

Then you may create either a callback-based client:

```javascript
var fecbClientCallbacks = new FedExCrossBorder.client(args);
```

Or a promise-based client:

```javascript
var fecbClientPromises = new FedExCrossBorder.clientPromise(args);
```

Calling a method on the client is pretty straightforward; client methods match the method names in the FECB docs and WSDL file, and your request data is passed in an object as the first argument for each (details for each method/object below). Callback client methods return values via node 'standard' two argument callbacks, and Promise client methods, when assigned to a variable, are promises that return data from the API on success. Here's an example of each using the 'ConnectProductInfo':

```javascript
// lets assume we've already created objects for each product here...
var productInfoArray = [
	productObject1,
	productObject2
];

// call to method using callback client
// we'll log the results to console
fecbClientCallbacks.productInfo(productInfoArray, function(error, result) {

	if (error) {
		console.log("Oh no! \n" + error.message);
	}
	
	else {
		console.log("Yay, we got stuff! \n" + JSON.stringify(result));
	}

});

// call to method using promise client
// we'll log results to console when promise is resolved or rejected
var sendProductInfo = fecbClientPromises.productInfo(productInfoArray);
sendProductInfo.then(function(result) {

	console.log("Yay, we got stuff! \n" + JSON.stringify(result));

}).catch((error) => {

	console.log("Oh no! \n" + error.message);

});
```

## Client Constructors

Each constructor's first argument is an object containing properties that define the behavior of the client during method calls. The synchronous client also requires a second argument, the callback function. The 'args' object, as mentioned in the previous section, always requires a 'merchantKey' and a 'language' property. Both are ECMA 6 compliant 'classes' (basically prototypes with class-like syntax), so they are instantiated using the 'new' keyword, with constructor arguments after the class name. Full explanation of the usage for each constructor:

### Client Constructor - Callbacks

##### Function

new FedExCrossBorder.client(args(object))

##### Returns

FedExCBClientCallback Object

##### Valid Properties for 'args'

property | valueType | notes
:--- | :--- | :---
language | string(2) | v4.4 supports 'en' or 'es'
merchantKey | string(45) | value provided by FECB
stripWrapper | boolean | default false
returnRaw | boolean | default false; only acknowledged if stripWrapper is false
returnSoapHeader | boolean | default false; only acknowledged if stripWrapper is false
returnFullResponse | boolean | default false; only acknowledged if stripWrapper is false


### Client Constructor - Promises

##### Function

new FedExCrossBorder.clientPromise(args(object))

##### Returns

FedExCBClientPromise Object

##### Valid Properties for 'args'

property | valueType | notes
:--- | :--- | :---
language | string(2) | required, v4.4 supports 'en' or 'es'
merchantKey | string(45) | required, value provided by FECB
stripWrapper | boolean | default false
returnRaw | boolean | default false; only acknowledged if stripWrapper is false
returnSoapHeader | boolean | default false; only acknowledged if stripWrapper is false
returnFullResponse | boolean | default false; only acknowledged if stripWrapper is false

### Optional Arguments of 'args' for both Constructors

In addition to the the required 'language' and 'merchantKey' properties, the argument object for the client constructors also accepts some optional properties, noted above. These affect how the client's methods return the successful response. 

By default, methods return a result object that contain three properties: body, request, and statusCode. This body is an object parsed from the server's response body to the API call, statusCode is the http status for the response, and request echoes the request JS object sent to the API server. 

For debugging or other logical purposes, the soapHeader (as JSON), the raw response string, and/or the full response JS object can be added to the result object of all methods by setting the 'returnSoapHeader', 'returnRaw' and/or 'returnFullResponse arguments to true, respctively. Setting 'returnSoapHeader' to true adds the 'soapHeader' property to the result object, which contains a JSON encoded soapHeader of the API response. Setting 'returnRaw' to true adds the 'raw' property to the result object, which contains the raw XML string of the API response body. Setting 'returnFullResponse' adds the 'response' property, a JS object containing the full response from the server as a [Node.js http.IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage). Each of these are IN ADDITION to the 'body', 'statusCode', and 'request' properties, which are always returned if 'stripWrapper' is false.

But, if you'd like to go in the opposite direction and return ONLY the body object, without a wrapper, setting the 'stripWrapper' property of 'args' to true will return the 'body' object without another object wrapping it, and WILL NOT return statusCode or request. This option also disables the effects of 'returnFullResponse', 'returnRaw' and 'returnSoapHeader'.

Examples focus on the callback based client, but the same rules apply for the promise client as well... except the result is an argument of your promise success handler rather than of the callback.

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
	// if returnRaw, returnSoapHeader, and/or returnFullResponse 
	// are set to true here,
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
var args5 = {
	"language": "en",
	"merchantKey": "***myMerchantKeyValue***",
	// stripWrapper defaults to false
	"returnFullResponse": true
}

var fecbClientDefault = new FedExCrossBorder.client(args1);
// methods for this client will return a result object like this:
// {
// 	   body: {
//			property1: 'result1',
//			etc: etc...
//     },
//		request: {
//			requestprop1: 'prop1',
//			etc: etc...
//		},
//		statusCode: 200
// }

var fecbClientLean = new FedExCrossBorder.client(args2);
// methods for this client will only return the body object AS the result:
// {
//		property1: 'result1',
//		etc: etc...
// }

var fecbClientRaw = new FedExCrossBorder.client(args3);
// methods for this client will return a result object with both raw and response values:
// {
// 	   body: {
//			property1: 'result1',
//			etc: etc...
//     },
//		request: {
//			requestprop1: 'prop1',
//			etc: etc...
//		},
//		statusCode: 200,
//		raw:	'<ns1:ConnectProductInfoResponse><return xsi:type="ns1:ConnectProductInfoResponse">
//				<error xsi:type="xsd:int">0</error><errorMessage xsi:type="xsd:string"></errorMessage>
//				<errorMessageDetail xsi:type="xsd:string"></errorMessageDetail></return</ns1:ConnectProductInfoResponse>'
// }

var fecbClientHeaders = new FedExCrossBorder.client(args4);
// methods for this client will return a result object with both soapHeader and response values:
// {
// 	   body: {
//			property1: 'result1',
//			etc: etc...
//     },
//		request: {
//			requestprop1: 'prop1',
//			etc: etc...
//		},
//		statusCode: 200,
//		soapHeader:	'{"xmlns:SOAP-ENV": "http://schemas.xmlsoap.org/soap/envelope/", 
//					"xmlns:ns1": "https://api.crossborder.fedex.com/services/v44", 
//					"xmlns:xsd": "http://www.w3.org/2001/XMLSchema",
//					"xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
//					"xmlns:SOAP-ENC": "http://schemas.xmlsoap.org/soap/encoding/",
//					"SOAP-ENV:encodingStyle": "http://schemas.xmlsoap.org/soap/encoding/"}'
// }

// IN CASE IT WASN'T OBVIOUS... these are not the actual values the API returns...
// Just illustrating the effects of the constructor args...

```

# BOILERPLATE FOR EACH METHOD

##### Arguments Passed to Callback

argument | valueType | notes
:--- | :--- | :---
error | object(JS Error or subclass thereof) | false if no error occurs
result | object | by default contains 'body'(JS Object), 'request'(JS Object), and 'statusCode'(number)

##### Arguments Passed to Promise resolution function

argument | valueType | notes
:--- | :--- | :---
result | object | by default contains 'body'(JS Object), 'request'(JS Object), and 'statusCode'(number)

##### Arguments Passed to Promise rejection function

argument | valueType | notes
:--- | :--- | :---
error | object(JS Error or subclass thereof) | 

## Methods

Methods for each client are 1:1 matches for the SOAP API methods [documented by FECB](http://crossborder.fedex.com/us/ecommerce/api/index.shtml), but the function names and arguments have changed from the SOAP equivalents. Operations for both clients are identical, but there's an extra argument for the callback client (for the callback, of course!).

### ConnectProductInfo

##### Purpose

Sends product data to FECB to create or update product details in their database.

##### Functions

Callback - client.productInfo(request, callback)

Promise - client.productInfo(request)

##### Request Object Parameters

The 'request' argument for this method is an array of objects, one per product:

```json
[
	{
		"id": "string(255)",
		"description": "string(250)",
		"price": "float",
		"currency": "string(3)",
		"exportHub": "string(3)",
		"origin": "string(2)",
		"itemInformation": {
			"w": "float",
			"h": "float",
			"l": "float",
			"wt": "float"
		},
		"optionalArgs": {
			"productName": "string(255)",
			"url": "string(255)",
			"imageUrl": "string(255)",
			"hsCode": "string(15)",
			"eccn": "string(15)",
			"hazFlag": "boolean",
			"licenseFlag": "array -OR- comma-separated string (limited to ~84 country codes)",
			"importFlag": "array -OR- comma-separated string (limited to ~84 country codes)",
			"productType": "string(255)"
		} 
	},
	{
	(additional objects, if any)
	}	
]
```

The array must contain at least ONE product object. All object parameters are required except 'optionalArgs', which can, as the name suggests, contain any number of the optional parameters or be omitted entirely. Also, if w, l, and h are defined in the 'itemInformation' object, wt is optional, and vice versa.

##### Arguments Passed to Callback

argument | valueType | notes
:--- | :--- | :---
error | object(JS Error or subclass thereof) | false if no error occurs
result | object | by default contains 'body'(JS Object), 'request'(JS Object), and 'statusCode'(number)

##### Arguments Passed to Promise resolution function

argument | valueType | notes
:--- | :--- | :---
result | object | by default contains 'body'(JS Object), 'request'(JS Object), and 'statusCode'(number)

##### Arguments Passed to Promise rejection function

argument | valueType | notes
:--- | :--- | :---
error | object(JS Error or subclass thereof) | 


### ConnectLandedCost

### ConnectOrder

### ConnectOrderTrackingUpdate

### ConnectOrderRemove

### ConnectSkuStatus

## Objects

Several classes are available to use, with built in validation and some santization as part of the constructor. These are used by the client methods internally, but are exposed for your use as well, if you need them.

### cartonsDat

##### Purpose

Contains dimensions and/or weight for a carton or item

##### Constructor Function

new FedExCrossBorder.cartonsDat(lengthIn, widthIn, heightIn, weightLb);

##### Constructor Arguments

arguments | valueType | notes
:--- | :--- | :---
lengthIn | float(4) | item length in inches
widthIn | float(4) | item width in inches
heightIn | float(4) | item height in inches
weightLb | float(4) | item weight in pounds

##### Methods

getXmlString() - no arguments, returns SOAP formatted XML string of object

### productInfoDat

##### Purpose

Contains product details for updating FECB product database

##### Constructor Function

new FedExCrossBorder.productInfoDat(id, description, price, currency, exportHub, origin, itemInformation, optionalArgs)

##### Constructor Arguments

arguments | valueType | notes
:--- | :--- | :---
id | string | unique product identifier
description | string | human readable product description
price | float(4) | sales price for item
currency | string(3) | three letter identifier for item price currency
exportHub | string(3) | three letter identifier for FECB distribution hub
origin | string(2) | two letter identifier for product country of origin
iteminformation | object cartonsDat | physical data for item
optionalArgs | object | optional; may contain properties matching any of the optionalArgs in the below table.

##### optionalArgs Properties

All properties, like the optionalArgs argument itself, are optional.

property | valueType | notes
:--- | :--- | :---
productName | human readable identifier for product
url | string | URL that points to product on ecommerce site
imageUrl | string | URL that points to product image
hsCode | string(10) | code that allows the calculation of tax payable in the destination country of the shipment
eccn | string(15) | eccn code for product
hazFlag | boolean | whether product is flagged as hazardous; default false, set to true if product is flagged as hazardous
importFlag | string -OR- array | comma separated string or array of two letter strings indicating countries product is forbidden to enter
licenseFlag | string -OR- array | comma separated string or array of two letter strings indicating countries product requires license to enter
productType | string | merchant category associated with this item

##### Methods

getXmlString() - no arguments, returns SOAP formatted XML string of object


### productInfo

### orderInformation

### trackingList

### productsIdDat

## Functions

Utility functions used by the clients are also exposed for your use, should you need them.

### validateLanguage

### validateCountry

### validateCurrency

### getCountryForHub

### getCarrierCode

## Constants

If the objects and functions aren't enough, the constants containing various FECB provided tables, as of API v4.4, (also listed in CSV format in the /csv directory of this package) are exposed for direct access, should you need them.

### exportHubs

### countryCodes

### languages

### carriers