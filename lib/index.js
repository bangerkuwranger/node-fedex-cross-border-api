'use_strict'

/*****
* application constants and requires
*****/

const fecbUri = 'https://api.crossborder.fedex.com/services/v4.4';
// const soap = require('soap');
const Promise = require('bluebird');
const request = require('request');
const requestAsync = require('request-promise');
const xml2js = Promise.promisifyAll(require('xml2js'));
const util = require('util');

/*****
* exported classes (used for interface requests and input)
*****/

class CountryCode {

	constructor(code, name, currency) {
	
		this.name = ('string' != typeof name || null === name) ? null : name;
		this.code = ('string' != typeof code || null === code) ? null : code.substring(0, 2).toUpperCase();
		this.currency = ('string' != typeof currency || null === currency) ? null : currency.substring(0, 3).toUpperCase();
	
	}

}

class ExportHub {

	constructor(facilityCode, countryCode) {
	
		this.facility = ('string' != typeof facilityCode || null === facilityCode) ? null : facilityCode.substring(0, 3).toUpperCase();
		this.country = ('string' != typeof countryCode || null === countryCode) ? null : facilityCode.substring(0, 2).toUpperCase()
	
	}

}

class CartonsDat {

	constructor(lengthIn, widthIn, heightIn, weightLb) {
	
		if (('undefined' != typeof lengthIn || null === lengthIn || 'undefined' != typeof widthIn || null === widthIn || 'undefined' != typeof heightIn || null === heightIn) && ('undefined' != typeof weightLb || null === weightLb)) {
		
			throw new TypeError('Both dimensions and weight are missing from CartonsDat. Contructor requires l,w,&h or weight at a minimum');
		
		}
		else {
		
			this.l = 'number' == typeof lengthIn ? null : parseFloat(lengthIn.toFixed(4));
			this.w = 'number' == typeof widthIn ? null : parseFloat(widthIn.toFixed(4));
			this.h = 'number' == typeof heightIn ? null : parseFloat(heightIn.toFixed(4));
			this.wt = 'number' == typeof weightLb ? null : parseFloat(weightLb.toFixed(4));
		
		}
	
	}
	
	getXmlString() {
	
		var CartonsDatValues = Object.keys(this);
		var CartonsDatXml = '<item xsi:type="v4:CartonsDatDat">';
		for (let i = 0; i < CartonsDatValues.length; i++) {
		
			if (this.hasOwnProperty(ProductInfoDatValues[i]) && 'function' != typeof ProductInfoDatValues[i]) {
			
				CartonsDatXml += '<' + CartonsDatValues[i] + '>' + this[CartonsDatValues[i]] + '</' + CartonsDatValues[i] + '>';
			
			}
		
		}
		CartonsDatXml += '</item>';
		return CartonsDatXml;
	
	}

}

class ProductInfoDat {

	constructor(id, description, price, currency, exportHub, origin, itemInformation, optionalArgs) {
	
		if ('string' != typeof id || 'string' != typeof description || 'number' != typeof price || 'string' != typeof currency || 'string' != typeof exportHub || 'string' != typeof origin || 'object' != typeof itemInformation || !(itemInformation instanceof CartonsDat)) {
		
			throw new TypeError('Invalid parameter type passed to ProductInfoDat constructor');
		
		}
		else {
		
			this.productID = id.substring(0,255);
			this.description = description.substring(0,245);
			this.price = (null === price || isNaN(price)) ? 0.0000 : parseFloat(price.toFixed(4));
			currency = currency.substring(0, 3).toUpperCase();
			this.itemValuationCurrency = ('string' == typeof currency && isValidCurrency(currency)) ? currency : 'USD';
			exportHub = exportHub.substring(0, 3).toUpperCase();
// 			console.log(exportHubArray);
			var hubCountry = getHubCountry(exportHub);
			this.itemExportHubCountry = ('string' == typeof hubCountry && hubCountry) ? hubCountry : 'US';
			origin = origin.substring(0, 2).toUpperCase();
			this.countryOfOrigin = ('string' == typeof origin && isValidCurrency(origin)) ? origin : 'US';
			this.itemInformation = ('object' == typeof itemInformation && itemInformation instanceof CartonsDat) ? [itemInformation] : [new CartonsDat()];
			if ('object' == typeof optionalArgs && null !== optionalArgs) {
			
				if ('string' == typeof optionalArgs.productName) {
				
					this.productName = optionalArgs.productName.substring(0,255);
				
				}
				if ('string' == typeof optionalArgs.url) {
				
					this.url = optionalArgs.url.substring(0,255);
				
				}
				if ('string' == typeof optionalArgs.imageUrl) {
				
					this.imageUrl == optionalArgs.imageUrl.substring(0,255);
				
				}
				if ('string' == typeof optionalArgs.hsCode) {
				
					this.hsCode = optionalArgs.hsCode.substring(0,10);
				
				}
				if ('string' == typeof optionalArgs.eccn) {
				
					this.eccn = optionalArgs.eccn.substring(0,15);
				
				}
				if ('undefined' != typeof optionalArgs.hazFlag && null !== optionalArgs.hazFlag) {
				
					this.hazFlag = (optionalArgs.hazFlag && 'false' !== optionalArgs.hazFlag.toString().trim().toLowerCase()) ? 1 : 0;
				
				}
				else {
				
					this.hasFlag = 0;
				
				}
				if ('string' == typeof optionalArgs.licenseFlag) {
				
					var validCountries = [];
					var licenseCountries = optionalArgs.licenseFlag.split(',');
					for (let i = 0; i < licenseCountries.length; i++) {
					
						let currentCountry = licenseCountries[i].trim().substring(0, 2).toUpperCase();
						if (isValidCountry(currentCountry)) {
						
							validCountries.push(currentCountry);
						
						}
					
					}
					this.licenseFlag = validCountries.toString();
				
				}
				if ('object' == typeof optionalArgs.licenseFlag && Array.isArray(optionalArgs.licenseFlag)) {
				
					var validCountries = [];
					for (let i = 0; i < optionalArgs.licenseFlag.length; i++) {
					
						let currentCountry = optionalArgs.licenseFlag[i].toString().trim().substring(0, 2).toUpperCase();
						if (isValidCountry(currentCountry)) {
						
							validCountries.push(currentCountry);
						
						}
					
					}
					this.licenseFlag = validCountries.toString();
				
				}
				if ('string' == typeof optionalArgs.importFlag) {
				
					var validCountries = [];
					var licenseCountries = optionalArgs.importFlag.split(',');
					for (let i = 0; i < licenseCountries.length; i++) {
					
						let currentCountry = licenseCountries[i].trim().substring(0, 2).toUpperCase();
						if (isValidCountry(currentCountry)) {
						
							validCountries.push(currentCountry);
						
						}
					
					}
					this.importFlag = validCountries.toString();
				
				}
				if ('object' == typeof optionalArgs.importFlag && Array.isArray(optionalArgs.importFlag)) {
				
					var validCountries = [];
					for (let i = 0; i < optionalArgs.importFlag.length; i++) {
					
						let currentCountry = optionalArgs.importFlag[i].toString().trim().substring(0, 2).toUpperCase();
						if (isValidCountry(currentCountry)) {
						
							validCountries.push(currentCountry);
						
						}
					
					}
					this.importFlag = validCountries.toString();
				
				}
				if ('string' == typeof optionalArgs.productType) {
				
					this.productType = optionalArgs.productType.substring(0, 255);
				
				}
			
			}
			else {
			
				this.hazFlag = 0;
			
			}
		
		}
	
	}
	
	getXmlString() {
	
		var ProductInfoDatValues = Object.keys(this);
		var ProductInfoDatXml = '<item xsi:type="v4:ProductInfoDat">';
		for (let i = 0; i < ProductInfoDatValues.length; i++) {
		
			if (this.hasOwnProperty(ProductInfoDatValues[i]) && 'function' != typeof ProductInfoDatValues[i]) {
			
				ProductInfoDatXml += '<' + ProductInfoDatValues[i] + '>' + this[ProductInfoDatValues[i]] + '</' + ProductInfoDatValues[i] + '>';
			
			}
		
		}
		ProductInfoDatXml += '</item>';
		return ProductInfoDatXml;
	
	}

}

class ProductInfo {

	constructor(id, quantity, price, exportHub) {
	
		if ('string' != typeof id || 'undefined' == typeof quantity || isNaN(parseInt(quantity)) || 'number' != typeof price || 'string' != typeof exportHub) {
		
			throw new TypeError('Invalid parameter type passed to ProductInfo constructor');
		
		}
		else {
		
			this.productID = id.substring(0,255);
			this.quantity = (null === quantity || isNaN(quantity)) ? 0 : parseInt(quantity);
			this.price = (null === price || isNaN(price)) ? 0.0000 : parseFloat(price.toFixed(4));
			var hubCountry = getHubCountry(exportHub);
			this.itemExportHubCountry = ('string' == typeof hubCountry && hubCountry) ? hubCountry : 'US';
		
		}
	
	}
	
	getXmlString() {
	
		var ProductInfoValues = Object.keys(this);
		var ProductInfoXml = '<item xsi:type="v4:ProductInfo">';
		for (let i = 0; i < ProductInfoValues.length; i++) {
		
			if (this.hasOwnProperty(ProductInfoValues[i]) && 'function' != typeof ProductInfoValues[i]) {
			
				ProductInfoXml += '<' + ProductInfoValues[i] + '>' + this[ProductInfoValues[i]] + '</' + ProductInfoValues[i] + '>';
			
			}
		
		}
		ProductInfoXml += '</item>';
		return ProductInfoXml;
	
	}

}

// carrier mapping:
// 1=UPS, 2=FedEx, 3=DHL, 4=USPS, 5=EMS, 6=Other
class OrderInformation {

	constructor(id, quantity, price, currency, optionalArgs) {
	
		if ('string' != typeof id || 'undefined' == typeof quantity || isNaN(parseInt(quantity)) || 'number' != typeof price || 'string' != typeof currency) {
		
			throw new TypeError('Invalid parameter type passed to OrderInformation constructor');
		
		}
		else {
		
			this.productID = id.substring(0,255);
			this.quantity = (null === quantity || isNaN(quantity)) ? 0 : parseInt(quantity);
			this.price = (null === price || isNaN(price)) ? 0.0000 : parseFloat(price.toFixed(4));
			currency = currency.trim().substring(0, 3).toUpperCase();
			this.orderValuationCurrency = ('string' == typeof currency && isValidCurrency(currency)) ? currency : 'USD';
			if ('object' == typeof optionalArgs && null !== optionalArgs) {
		
				if ('string' == typeof optionalArgs.exportHub) {
			
					var hubCountry = getHubCountry(optionalArgs.exportHub.trim());
					this.itemExportHubCountry = ('string' == typeof hubCountry && hubCountry) ? hubCountry : 'US';
			
				}
				if('undefined' != typeof optionalArgs.carrier) {
			
					var currentInt = parseInt(optionalArgs.carrier);
					if (isNaN(currentInt)) {
					
						currentInt = getCarrierCode(optionalArgs.carrier);
					
					}
					else {
					
						currentInt = (0 < currentInt && 6 > currentInt) ? currentInt : 6;
					
					}
					this.carrier = currentInt.toString();
			
				}
				if ('string' == typeof optionalArgs.trackingNumber) {
			
					this.trackingNumber = optionalArgs.trackingNumber.trim().substring(0,100);
			
				}
		
			}
		
		}
	
	}
	
	getXmlString() {
	
		var OrderInformationValues = Object.keys(this);
		var OrderInformationXml = '<item xsi:type="v4:OrderInformation">';
		for (let i = 0; i < ProductInfoValues.length; i++) {
		
			if (this.hasOwnProperty(OrderInformationValues[i]) && 'function' != typeof OrderInformationValues[i]) {
			
				OrderInformationXml += '<' + OrderInformationValues[i] + '>' + this[OrderInformationValues[i]] + '</' + OrderInformationValues[i] + '>';
			
			}
		
		}
		OrderInformationValues += '</item>';
		return OrderInformationXml;
	
	}

}

class TrackingList {

	// carrier mapping:
	// 1=UPS, 2=FedEx, 3=DHL, 4=USPS, 5=EMS, 6=Other
	constructor(id, quantity, trackingNumber, carrier) {
	
		if ('string' != typeof id || 'undefined' == typeof quantity || isNaN(parseInt(quantity)) || 'undefined' == typeof trackingNumber || 'undefined' == typeof carrier) {
		
			throw new TypeError('Invalid parameter type passed to TrackingList constructor');
		
		}
		else {
		
			this.productID = id.substring(0,255);
			this.quantity = (null === quantity || isNaN(quantity)) ? 0 : parseInt(quantity);
			this.trackingNumber = trackingNumber.toString().substring(0,255);
			if ('string' == typeof carrier) {
			
				if (-1 === carrier.indexOf(',')) {
				
					var currentInt = parseInt(carrier.trim());
					if (isNaN(currentInt)) {
					
						currentInt = getCarrierCode(carrierArray[i]);
					
					}
					else {
					
						currentInt = (0 < currentInt && 6 > currentInt) ? currentInt : 6;
					
					}
					this.carrier = currentInt.toString();
				
				}
				else {
				
					carrierArray = carrier.split(',');
					var carrierString = ''
					for (let i = 0; i < carrierArray.length; i++) {
					
						let currentInt = parseInt(carrierArray[i].trim());
						if (isNaN(currentInt)) {
						
							currentInt = getCarrierCode(carrierArray[i]);
						
						}
						else {
						
							currentInt = (0 < currentInt && 6 > currentInt) ? currentInt : 6;
						
						}
						carrierString += currentInt;
						if ((i + 1) < carrierArray.length) {
						
							carrierString +=',';
						
						}
					
					}
					this.carrier = carrierString;
				
				}
			
			}
			else if ('number' == typeof carrier) {
			
				var currentInt = parseInt(carrier);
				this.carrier = (0 < currentInt && 6 > currentInt) ? currentInt.toString() : '6';
			
			}
			else if ('object' == typeof carrier && Array.isArray(carrier)) {
			
				var carrierString = ''
				for (let i = 0; i < carrier.length; i++) {
				
					let currentInt = parseInt(carrier[i].trim());
					if (isNaN(currentInt)) {
					
						currentInt = getCarrierCode(carrier[i]);
					
					}
					else {
					
						currentInt = (0 < currentInt && 6 > currentInt) ? currentInt : 6;
					
					}
					carrierString += currentInt;
					if ((i + 1) < carrier.length) {
					
						carrierString +=',';
					
					}
				
				}
				this.carrier = carrierString;
			
			}
			else {
			
				this.carrier = 6;
			
			}
		
		}
	
	}
	
	getXmlString() {
	
		var TrackingListValues = Object.keys(this);
		var TrackingListXml = '<item xsi:type="v4:TrackingList">';
		for (let i = 0; i < TrackingListValues.length; i++) {
		
			if (this.hasOwnProperty(TrackingListValues[i]) && 'function' != typeof TrackingListValues[i]) {
			
				TrackingListXml += '<' + TrackingListValues[i] + '>' + this[TrackingListValues[i]] + '</' + TrackingListValues[i] + '>';
			
			}
		
		}
		TrackingListXml += '</item>';
		return TrackingListXml;
	
	}

}

class ProductsIdDat {

	constructor(id) {
	
		if ('string' != typeof id) {
		
			throw new TypeError('Invalid parameter type passed to ProductsIdDat constructor');
		
		}
		else {
		
			this.productID = id.substring(0,255);
		
		}
	
	}
	
	getXmlString() {
	
		var ProductsIdDatValues = Object.keys(this);
		var ProductsIdDatXml = '<item xsi:type="v4:ProductsIdDat">';
		for (let i = 0; i < ProductInfoValues.length; i++) {
		
			if (this.hasOwnProperty(ProductsIdDatValues[i]) && 'function' != typeof ProductsIdDatValues[i]) {
			
				ProductsIdDatXml += '<' + ProductsIdDatValues[i] + '>' + this[ProductsIdDatValues[i]] + '</' + ProductsIdDatValues[i] + '>';
			
			}
		
		}
		ProductsIdDatXml += '</item>';
		return ProductsIdDatXml;
	
	}

}

/*****
* non-exported classes (used for validating responses)
*****/

class LandedProduct {

	constructor(errorMessage, productID, itemExportHubCountry, orderValuationCurrencyCode, calculated, dutyCost, taxCost, ddpAvailable) {
	
		this.errorMessage = errorMessage;
		this.productID = id.substring(0,255);
		this.itemExportHubCountry = itemExportHubCountry.substring(0, 2);
		this.orderValuationCurrencyCode = orderValuationCurrencyCode.substring(0, 3);
		calculated = parseInt(calculated);
		this.calculated = isNaN(calculated) ? 0 : calculated;
		this.dutyCost = (null === dutyCost || isNaN(dutyCost)) ? 0.0000 : parseFloat(dutyCost.toFixed(4));
		this.taxCost = (null === taxCost || isNaN(taxCost)) ? 0.0000 : parseFloat(taxCost.toFixed(4));
		ddpAvailable = parseInt(ddpAvailable);
		this.ddpAvailable = isNaN(ddpAvailable) ? 0 : ddpAvailable;
	
	}
	
	getXmlString() {
	
		var LandedProductValues = Object.keys(this);
		var LandedProductXml = '<item xsi:type="v4:LandedProduct">';
		for (let i = 0; i < ProductInfoValues.length; i++) {
		
			if (this.hasOwnProperty(LandedProductValues[i]) && 'function' != typeof LandedProductValues[i]) {
			
				LandedProductXml += '<' + LandedProductValues[i] + '>' + this[LandedProductValues[i]] + '</' + LandedProductValues[i] + '>';
			
			}
		
		}
		LandedProductXml += '</item>';
		return LandedProductXml;
	
	}

}

/*****
* exported constants
*****/

const exportHubArray = [
	new ExportHub('TPA', 'US'),
	new ExportHub('LGB', 'US'),
	new ExportHub('BRU', 'BE'),
	new ExportHub('LON', 'UK'),
	new ExportHub('LIM', 'PE'),
];
const countryCodeArray = [
	new CountryCode("AF","Afghanistan","AFN"),
	new CountryCode("AL","Albania","ALL"),
	new CountryCode("DZ","Algeria","DZD"),
	new CountryCode("AS","American Samoa","USD"),
	new CountryCode("AD","Andorra","EUR"),
	new CountryCode("AO","Angola","AOA"),
	new CountryCode("AI","Anguilla","XCD"),
	new CountryCode("AG","Antigua","XCD"),
	new CountryCode("AR","Argentina","ARS"),
	new CountryCode("AM","Armenia","AMD"),
	new CountryCode("AW","Aruba","AWG"),
	new CountryCode("AU","Australia","AUD"),
	new CountryCode("AT","Austria","EUR"),
	new CountryCode("AZ","Azerbaijan","AZN"),
	new CountryCode("1F","Azores (Portugal) ","EUR"),
	new CountryCode("BS","Bahamas","BSD"),
	new CountryCode("BH","Bahrain","BHD"),
	new CountryCode("BD","Bangladesh","BDT"),
	new CountryCode("BB","Barbados","BBD"),
	new CountryCode("1A","Barbuda","XCD"),
	new CountryCode("BY","Belarus","EUR"),
	new CountryCode("BE","Belgium","EUR"),
	new CountryCode("BZ","Belize","BZD"),
	new CountryCode("BJ","Benin","XAF"),
	new CountryCode("BM","Bermuda","BMD"),
	new CountryCode("BT","Bhutan","BTN"),
	new CountryCode("BO","Bolivia","BOB"),
	new CountryCode("X1","Bonaire",null),
	new CountryCode("BA","Bosnia and Herzegovina","BHD"),
	new CountryCode("BW","Botswana","BWP"),
	new CountryCode("BR","Brazil","BRL"),
	new CountryCode("BN","Brunei","BND"),
	new CountryCode("BG","Bulgaria","BGN"),
	new CountryCode("BF","Burkina Faso","XAF"),
	new CountryCode("BI","Burundi","BIF"),
	new CountryCode("KH","Cambodia","KHR"),
	new CountryCode("CM","Cameroon","XAF"),
	new CountryCode("CA","Canada","CAD"),
	new CountryCode("X2","Canary Islands","EUR"),
	new CountryCode("CV","Cape Verde","CVE"),
	new CountryCode("KY","Cayman Islands","KYD"),
	new CountryCode("CF","Central African Republic","XAF"),
	new CountryCode("TD","Chad","XAF"),
	new CountryCode("CL","Chile","CLP"),
	new CountryCode("CN","China","CNY"),
	new CountryCode("CO","Colombia","COP"),
	new CountryCode("MP","Commonwealth No. Mariana Islands","USD"),
	new CountryCode("KM","Comoros Islands","KMF"),
	new CountryCode("CG","Congo","XAF"),
	new CountryCode("CD","Congo, Democratic Republic","XAF"),
	new CountryCode("CK","Cook Islands","NZD"),
	new CountryCode("CR","Costa Rica","CRC"),
	new CountryCode("HR","Croatia","HRK"),
	new CountryCode("CW","Curacao",null),
	new CountryCode("CY","Cyprus","EUR"),
	new CountryCode("CZ","Czech Republic","CZK"),
	new CountryCode("DK","Denmark","DKK"),
	new CountryCode("DJ","Djibouti","DJF"),
	new CountryCode("DM","Dominica","XCD"),
	new CountryCode("DO","Dominican Republic","DOP"),
	new CountryCode("TP","East Timor","USD"),
	new CountryCode("EC","Ecuador","USD"),
	new CountryCode("EG","Egypt","EGP"),
	new CountryCode("SV","El Salvador","SVC"),
	new CountryCode("1D","England (U.K)","GBP"),
	new CountryCode("GQ","Equatorial Guinea","XAF"),
	new CountryCode("ER","Eritrea","RUB"),
	new CountryCode("EE","Estonia","EEK"),
	new CountryCode("ET","Ethiopia","ETB"),
	new CountryCode("FK","Falkland Islands","FKP"),
	new CountryCode("FO","Faroe Islands","DKK"),
	new CountryCode("FJ","Fiji Islands","FJD"),
	new CountryCode("FI","Finland","EUR"),
	new CountryCode("FR","France","EUR"),
	new CountryCode("GF","French Guiana","EUR"),
	new CountryCode("PF","French Polynesia","EUR"),
	new CountryCode("GA","Gabon","XAF"),
	new CountryCode("GM","Gambia","GMD"),
	new CountryCode("GE","Georgia","GEL"),
	new CountryCode("DE","Germany","EUR"),
	new CountryCode("GH","Ghana","GHS"),
	new CountryCode("GI","Gibraltar","GBP"),
	new CountryCode("GR","Greece","EUR"),
	new CountryCode("GL","Greenland","DKK"),
	new CountryCode("GD","Grenada","XCD"),
	new CountryCode("GP","Guadeloupe","EUR"),
	new CountryCode("GU","Guam","USD"),
	new CountryCode("GT","Guatemala","GTQ"),
	new CountryCode("GG","Guernsey","GBP"),
	new CountryCode("GN","Guinea","GNF"),
	new CountryCode("GW","Guinea-Bissau","XAF"),
	new CountryCode("GY","Guyana","GYD"),
	new CountryCode("HT","Haiti","HTG"),
	new CountryCode("HN","Honduras","HNL"),
	new CountryCode("HK","Hong Kong","HKD"),
	new CountryCode("HU","Hungary","HUF"),
	new CountryCode("IS","Iceland","ISK"),
	new CountryCode("IN","India","INR"),
	new CountryCode("ID","Indonesia","IDR"),
	new CountryCode("IR","Iran","IRR"),
	new CountryCode("IQ","Iraq","IQD"),
	new CountryCode("1E","Ireland, Northern (U.K.)","EUR"),
	new CountryCode("IE","Ireland, Republic of","EUR"),
	new CountryCode("IL","Israel","ILS"),
	new CountryCode("IT","Italy","EUR"),
	new CountryCode("CI","Ivory Coast",null),
	new CountryCode("JM","Jamaica","JMD"),
	new CountryCode("JP","Japan","JPY"),
	new CountryCode("JE","Jersey","GBP"),
	new CountryCode("JO","Jordan","JOD"),
	new CountryCode("KZ","Kazakhstan","EUR"),
	new CountryCode("KE","Kenya","KES"),
	new CountryCode("KI","Kiribati","AUD"),
	new CountryCode("KR","Korea, Republic of","KRW"),
	new CountryCode("KP","Korea, The D.P.R of (North K.)","KPW"),
	new CountryCode("KV","Kosovo","EUR"),
	new CountryCode("KW","Kuwait","KWD"),
	new CountryCode("KG","Kyrgyzstan","KGS"),
	new CountryCode("LA","Laos","LAK"),
	new CountryCode("LV","Latvia","EUR"),
	new CountryCode("LB","Lebanon","LBP"),
	new CountryCode("LS","Lesotho","LSL"),
	new CountryCode("LR","Liberia","LRD"),
	new CountryCode("LY","Libya","LYD"),
	new CountryCode("LI","Liechtenstein","CHF"),
	new CountryCode("LT","Lithuania","LTL"),
	new CountryCode("LU","Luxembourg","EUR"),
	new CountryCode("MO","Macau","MOP"),
	new CountryCode("MK","Macedonia","MKD"),
	new CountryCode("MG","Madagascar","MYR"),
	new CountryCode("1G","Madeira (Portugal)","EUR"),
	new CountryCode("MW","Malawi","MWK"),
	new CountryCode("MY","Malaysia","MYR"),
	new CountryCode("MV","Maldives","MVR"),
	new CountryCode("ML","Mali","XAF"),
	new CountryCode("MT","Malta","EUR"),
	new CountryCode("MH","Marshall Islands","USD"),
	new CountryCode("MQ","Martinique","EUR"),
	new CountryCode("MR","Mauritania","MRO"),
	new CountryCode("MU","Mauritius","MUR"),
	new CountryCode("YT","Mayotte","EUR"),
	new CountryCode("MX","Mexico","MXN"),
	new CountryCode("FM","Micronesia","USD"),
	new CountryCode("MD","Moldova","MDL"),
	new CountryCode("MC","Monaco","EUR"),
	new CountryCode("MN","Mongolia","MNT"),
	new CountryCode("ME","Montenegro, Republica of","EUR"),
	new CountryCode("MS","Montserrat","XCD"),
	new CountryCode("MA","Morocco","MAD"),
	new CountryCode("MZ","Mozambique","MZN"),
	new CountryCode("MM","Myanmar (Burma)","MMK"),
	new CountryCode("NA","Namibia","ZAR"),
	new CountryCode("NR","Nauru, Republic of","AUD"),
	new CountryCode("NP","Nepal","NPR"),
	new CountryCode("NL","Netherlands, The","EUR"),
	new CountryCode("NK","Nevis","XCD"),
	new CountryCode("NC","New Caledonia","XPF"),
	new CountryCode("NZ","New Zealand","NZD"),
	new CountryCode("NI","Nicaragua","NIO"),
	new CountryCode("NE","Niger","XAF"),
	new CountryCode("NG","Nigeria","NGN"),
	new CountryCode("NU","Niue Island","NZD"),
	new CountryCode("NO","Norway","NOK"),
	new CountryCode("OM","Oman","OMR"),
	new CountryCode("PK","Pakistan","PKR"),
	new CountryCode("PW","Palau","USD"),
	new CountryCode("PS","Palestine","ILS"),
	new CountryCode("PA","Panama","PAB"),
	new CountryCode("PG","Papua New Guinea","PGK"),
	new CountryCode("PY","Paraguay","PYG"),
	new CountryCode("PE","Peru","PEN"),
	new CountryCode("PH","Philippines","PHP"),
	new CountryCode("PL","Poland","PLN"),
	new CountryCode("PT","Portugal","EUR"),
	new CountryCode("PR","Puerto Rico","USD"),
	new CountryCode("QA","Qatar","QAR"),
	new CountryCode("RE","Reunion Island","EUR"),
	new CountryCode("RO","Romania","EUR"),
	new CountryCode("RU","Russia","RUB"),
	new CountryCode("RW","Rwanda","RWF"),
	new CountryCode("AN","Saba","USD"),
	new CountryCode("X8","Saipan",null),
	new CountryCode("1M","Samoa","WST"),
	new CountryCode("SM","San Marino","EUR"),
	new CountryCode("ST","Sao Tome and Principe","STD"),
	new CountryCode("SA","Saudi Arabia","SAR"),
	new CountryCode("1C","Scotland (U.K)","GBP"),
	new CountryCode("SN","Senegal","XAF"),
	new CountryCode("RS","Serbia, Republic of","RSD"),
	new CountryCode("SC","Seychelles","SCR"),
	new CountryCode("SL","Sierra Leone","SLL"),
	new CountryCode("SG","Singapore","SGD"),
	new CountryCode("SK","Slovakia","SKK"),
	new CountryCode("SI","Slovenia","EUR"),
	new CountryCode("SB","Solomon Islands","AUD"),
	new CountryCode("SO","Somalia","SOS"),
	new CountryCode("X9","Somaliland",null),
	new CountryCode("ZA","South Africa","ZAR"),
	new CountryCode("ES","Spain","EUR"),
	new CountryCode("LK","Sri Lanka","LKR"),
	new CountryCode("BL","St. Barthelemy","EUR"),
	new CountryCode("1L","St. Croix","USD"),
	new CountryCode("XB","St. Eustatius",null),
	new CountryCode("1J","St. John","USD"),
	new CountryCode("KN","St. Kitts","XCD"),
	new CountryCode("LC","St. Lucia",null),
	new CountryCode("MF","St. Maarten","ANG"),
	new CountryCode("1K","St. Thomas","USD"),
	new CountryCode("VC","St. Vincent","XCD"),
	new CountryCode("SR","Suriname","USD"),
	new CountryCode("SZ","Swaziland","ZAR"),
	new CountryCode("SE","Sweden","SEK"),
	new CountryCode("CH","Switzerland","CHF"),
	new CountryCode("SY","Syria","SYP"),
	new CountryCode("XG","Tahiti",null),
	new CountryCode("TW","Taiwan","TWD"),
	new CountryCode("TJ","Tajikistan","TJS"),
	new CountryCode("TZ","Tanzania","TZS"),
	new CountryCode("TH","Thailand","THB"),
	new CountryCode("TG","Togo","XAF"),
	new CountryCode("TO","Tonga","TOP"),
	new CountryCode("TT","Trinidad and Tobago","TTD"),
	new CountryCode("TN","Tunisia","TND"),
	new CountryCode("TR","Turkey","TRY"),
	new CountryCode("TM","Turkmenistan","TMM"),
	new CountryCode("TC","Turks and Caicos Islands","USD"),
	new CountryCode("TV","Tuvalu","AUD"),
	new CountryCode("UG","Uganda","UGX"),
	new CountryCode("UA","Ukraine","EUR"),
	new CountryCode("AE","United Arab Emirates","AED"),
	new CountryCode("GB","United Kingdom","GBP"),
	new CountryCode("US","United States","USD"),
	new CountryCode("AK","United States - Alaska","USD"),
	new CountryCode("HI","United States - Hawaii","USD"),
	new CountryCode("UY","Uruguay","UYU"),
	new CountryCode("UZ","Uzbekistan","UZS"),
	new CountryCode("VU","Vanuatu","VUV"),
	new CountryCode("VE","Venezuela","VEF"),
	new CountryCode("VN","Vietnam","VND"),
	new CountryCode("VG","Virgin Islands (BR)","USD"),
	new CountryCode("VI","Virgin Islands (US)","USD"),
	new CountryCode("1B","Wales (U.K.) ",null),
	new CountryCode("WF","Wallis and Futuna ","CFP"),
	new CountryCode("WS","Western Samoa","WST"),
	new CountryCode("YE","Yemen","YER"),
	new CountryCode("YU","Yugoslavia","YUN"),
	new CountryCode("ZM","Zambia","ZMK"),
	new CountryCode("ZW","Zimbabwe","ZWD")
];
const languageArray = [
	'en',
	'es'
];
const carriers = {
	"UPS": 1,
	"FedEx": 2,
	"DHL": 3,
	"USPS": 4,
	"EMS": 5,
	"Other": 6
};

/*****
* exported helper functions
*****/

function isValidCurrency(currencyCode) {

	let i = 0;
	var isValid = false;
	while(i < countryCodeArray.length && !isValid) {
	
		if (currencyCode == countryCodeArray[i].currency) {
		
			isValid = true;
		
		}
		i++;
	
	}
	return isValid;

}

function isValidCountry(countryCode) {

	let i = 0;
	var isValid = false;
	while(i < countryCodeArray.length && !isValid) {
	
		if (countryCode == countryCodeArray[i].code) {
		
			isValid = true;
		
		}
		i++;
	
	}
	return isValid;

}

function getHubCountry(facilityCode) {

	let i = 0;
	var countryCode = false;
	while(i < exportHubArray.length && !countryCode) {
	
// 		console.log(i);
// 		console.log(exportHubArray[i]);
		if (facilityCode == exportHubArray[i].facilityCode) {
		
			countryCode = exportHubArray[i].countryCode;
		
		}
		i++;
	
	}
	
	return countryCode;

}

function getCarrierCode(carrierString) {

	if ('string' == typeof carrierString && carriers.hasOwnProperty(carrierString)) {
	
		return carriers[carrierString];
	
	}
	else {
	
		return 6;
	
	}

}

function isValidLanguage(languageCode) {

	var isValid = false;
	if (-1 !== languageArray.indexOf(languageCode.substring(0, 2).toLowerCase())) {
	
		isValid = true;
	
	}
	return isValid;

}

/*****
* non-exported helper functions
*****/

//given a function (only really used with constructors), returns an array of argument names.
function getConstructorArgNames(constructorFunc) {

	if ('function' !=  typeof constructorFunc) {
	
		return [];
	
	}
	else {
	
		return constructorFunc.toString()
		.replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg,'')
		.match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m)[1]
		.split(/,/);
	
	}

}

//given an xml node object, returns value stripped of parser garbage. If not an object, returns argument.
function xmlNodeValue(nodeObject) {

	if ('object' != typeof nodeObject || undefined == typeof nodeObject['_']) {
	
		return nodeObject;
	
	}
	else {
	
		return nodeObject['_'];
	
	}

}

//iterates over a parsed xml array of objects node and returns a JS array of those objects, optionally using a supplied object constructor for each (constructor argument names must match XML property names)
function xmlObjectNodeArray(nodeObject, objectConstructor) {

	if (!Array.isArray(nodeObject)) {
	
		return nodeObject;
	
	}
	else if (function == typeofObjectConstructor) {
	
		var returnArray = [];
		var argNameArray = getConstructorArgNames(objectConstructor);
		for (let i = 0; i < nodeObject.length; i++) {
		
			let argsArray = [];
			for (let i = 0; i < argNameArray.length; i++) {
			
				argsArray.push(xmlNodeValue(nodeObject[i][argNameArray[i]]));
			
			}
			returnArray[i] = new objectConstructor(...argsArray);
		
		}
		return returnArray;
	
	}
	else {
	
		var returnArray = [];
		for (let i = 0; i < nodeObject.length; i++) {
		
			returnArray[i] = {};
			if (nodeObject[i].hasOwnProperty('xsi:type')) {
			
				delete nodeObject[i]['xsi:type'];
			
			}
			for (let itemProp in nodeObject[i]) {
			
				if (nodeObject[i].hasOwnProperty(itemProp)) {
				
					returnArray[i][itemProp] = xmlNodeValue(nodeObject[i][itemProp]);
				
				}
			
			}
		
		}
		return returnArray;
	
	}

}

/*****
* exports (including callback & promise based client classes)
*****/

module.exports = {

	"client": class FedExCBClientCallback {
	
		constructor(args) {
		
			this.wsdlUri = fecbUri + '?wsdl';
			this.serviceUri = fecbUri;
			if ('string' != typeof args.language || 2 != args.language.trim().length) {
			
				throw new TypeError('FECB client constructor requires args.language to be a two character string');
			
			}
			else {
			
				this.language = isValidLanguage(args.language.trim().toLowerCase()) ? args.language.trim().toLowerCase() : 'en';
			
			}
			if ('string' != typeof args.merchantKey || 65 <= args.merchantKey.trim().length) {
			
				throw new TypeError('FECB client constructor requires args.merchantKey to be a string of 64 characters or fewer');
			
			}
			else {
			
				this.merchantKey = args.merchantKey.trim().substring(0, 64);
			
			}
			this.returnRaw = ('undefined' != typeof args.returnRaw && args.returnRaw) ? true : false;
			this.returnSoapHeader = ('undefined' != typeof args.returnSoapHeader && args.returnSoapHeader) ? true : false;
			this.stripWrapper = ('undefined' != typeof args.stripWrapper || !args.stripWrapper) ? false : true;
			this.returnFullResponse = ('undefined' != typeof args.returnFullResponse || !args.returnFullResponse) ? false : true;
			this.performRequestCallbacks = {};
		
		}
		
		performRequest(action, body, callback) {
		
			if ('function' != typeof callback || callback.length !== 3) {
			
				throw new TypeError('FECB client.performRequest was passed an invalid callback');
			
			}
			else {
			
				this.performRequestCallbacks[action] = callback;
				this.performRequestAction = action;
				this.performRequestXml = '<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v4="' + this.serviceUri + '" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"><soapenv:Header/><soapenv:Body><v4:' + action + ' soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><request xsi:type="v4:' + action + 'Request">' + body + '</request></v4:' + action + '></soapenv:Body></soapenv:Envelope>';
				
				var parser = new xml2js.Parser({explicitArray: false, trim: true, mergeAttrs: true});
				parser.parseString(this.performRequestXml, function(error, xmlObj) {
				
					if (error) {
					
// 						console.log(this.performRequestXml);
						return callback(error, null, null);
					
					}
					else {
					
						var requestOptions = {
							uri: this.serviceUri,
							method: 'POST',
							body: this.performRequestXml,
							encoding: 'utf8',
							gzip: true,
							headers: {
								'Content-Type': 'text/xml;charset=UTF-8',
								'Accept-Encoding': 'gzip,deflate',
								'Content-Length': this.performRequestXml.length,
								'SOAPAction': 'https://api.crossborder.fedex.com/services/v4.4#' + action
							}
						};
						request(requestOptions, function(error, response, body) {
				
							if (error) {
							
								return this.performRequestCallbacks[this.performRequestAction](error, null, null);
							
							}
							else {
							
								parser.parseString(body, function(error, parsedBody) {
							
									if (error) {
										
// 										console.log(body);
										return this.performRequestCallbacks[this.performRequestAction](false, response, body);
									
									}
									else {
									
// 										console.log(util.inspect(parsedBody, false, null));
										return this.performRequestCallbacks[this.performRequestAction](false, response, parsedBody);
									
									}
								
								}.bind(this));
							
							}
				
						}.bind(this));
					
					}
				
				}.bind(this));
			
			}
		
		}
		
		productInfo(itemsArray, callback) {
		
			if ('function' != typeof callback || callback.length !== 2) {
			
				throw new TypeError('FECB client.productInfo was passed an invalid callback');
			
			}
			else {
			
				this.productInfoCallback = callback;
				this.productInfoItems = [];
				var xmlItems = '';
				if ('object' == typeof itemsArray && Array.isArray(itemsArray) && 0 < itemsArray.length) {
				
					for (let i = 0; i < itemsArray.length; i++) {
					
						var optionalArgs = ('object' == typeof itemsArray[i].optionalArgs && null !== itemsArray[i].optionalArgs) ? itemsArray[i].optionalArgs : null;
						var itemInformation = ('object' == typeof itemsArray[i].itemInformation && null !== itemsArray[i].itemInformation) ? new CartonsDat(itemsArray[i].itemInformation.l, itemsArray[i].itemInformation.w, itemsArray[i].itemInformation.h, itemsArray[i].itemInformation.wt) : new CartonsDat(null,null,null,null);
						var productInfoObj = new ProductInfoDat(itemsArray[i].id, itemsArray[i].description, itemsArray[i].price, itemsArray[i].currency, itemsArray[i].exportHub, itemsArray[i].origin, itemInformation, optionalArgs);
						this.productInfoItems.push(productInfoObj);
						xmlItems += productInfoObj.getXmlString();
					
					}

					this.productInfoRequest = {
						items: this.productInfoItems,
						language: this.language,
						partnerKey: this.merchantKey
					};
					this.productInfoRequestXML = '<partnerKey xsi:type="xsd:string">' + this.productInfoRequest.partnerKey + '</partnerKey>';
					this.productInfoRequestXML += '<language xsi:type="xsd:string">' + this.productInfoRequest.language + '</language>';
					this.productInfoRequestXML += '<items xsi:type="v4:ArrayOfProductInfoDat" soapenc:arrayType="v4:ProductInfoDat[]">' + xmlItems + '</items>';
					debugger;
					this.performRequest('ConnectProductInfo', this.productInfoRequestXML, function(error, response, body) {
					
// 						console.log(this.performRequestXml);
						// xml2js.parseString(fecbClient.lastRequest, {explicitArray: false}, function(err, debug) {
// 									console.log(util.inspect(debug, {depth: null}));
// 								});
						if (error) {
						
// 							xml2js.parseString(error, {explicitArray: false, mergeAttrs: true}, function(err, debug) {
// 								console.log(util.inspect(debug, {depth: null}));
// 							});
							return this.productInfoCallback(error, null);
						
						}
						else {
						
							var justTheBody = body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectProductInfoResponse'].return;
							delete justTheBody['xsi:type'];
							var bodyError = ('undefined' != typeof justTheBody.error) ? xmlNodeValue(justTheBody.error) : 0;
							if (bodyError != 0) {
							
								var eMessage = 'Code ' + parseInt(bodyError);
								if ('string' == typeof xmlNodeValue(justTheBody.errorMessage)) {
								
									eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage);
								
								}
								error = new Error(eMessage);
								return this.productInfoCallback(error, null);
							
							}
							else {
							
								var bodyObj = {
									error: parseInt(bodyError),
									errorMessage: ('string' == typeof xmlNodeValue(justTheBody.errorMessage)) ? xmlNodeValue(justTheBody.errorMessage) : '',
									errorMessageDetail: ('string' == typeof xmlNodeValue(justTheBody.errorMessage)) ? xmlNodeValue(justTheBody.errorMessage) : ''
								};
// 								console.log(this.stripWrapper);
								if (this.stripWrapper) {
							
									return this.productInfoCallback(false, bodyObj);
							
								}
								else {
							
									var productInfoResult = {
										"body": bodyObj,
										"statusCode": response.statusCode,
										"request": this.productInfoRequest
									};
									if (this.returnRaw) {
								
										productInfoResult.raw = response.body;
								
									}
									if (this.returnSoapHeader) {
								
										let soapHeader = body['SOAP-ENV:Envelope'];
										delete soapHeader['SOAP-ENV:Body'];
										productInfoResult.soapHeader = JSON.stringify(soapHeader);
								
									}
									if (this.returnFullResponse) {
								
										productInfoResult.response = response;
								
									}
	// 								console.log("RESULT ${JSON.stringify(productInfoResult)}");
									return this.productInfoCallback(false, productInfoResult);
							
								}
							
							}
						
						}
					
					}.bind(this));
				
				}
				else {
				
					throw new TypeError('FECB client.productInfo was passed an invalid array of items');
				
				}
			
			}
		
		}
		
		// callback = function w/ two arguments: (error, result)
		// lcRequest = {
		//	items: [
		//		{
		//			productID: 'string',
		//			quantity: 'int',
		//			price: 'float(13,4)',
		//			itemExportHubCountry: 'string(2)'
		//		}
		//	],
		//	shipmentDestinationCountry: 'string(2)',
		//	optionalArgs: {
		//		privateIndividuals: 'string(1); "Y" or "N"',
		//		shipmentDestinationAddress1: 'string(250)',
		//		shipmentDestinationAddress2: 'string(250)',
		//		shipmentDestinationCity: 'string(50)',
		//		shipmentDestinationStateOrProvince: 'string(50)',
		//		shipmentDestinationZip: 'string(50)',
		//		domesticShippingCost: 'float(13,4)',
		//		insuranceFlag: 'int(1); 0 or 1',
		//		orderValuationCurrency: 'string(3)',
		//		requestedCostReturnedCurrency: 'string(3)',
		//		service: 'int(1); 0 (express), 1 (standard), or 2 (economy)'
		//	}
		// }
		landedCost(lcRequest, callback) {
		
			if ('function' != typeof callback || callback.length !== 2) {
			
				throw new TypeError('FECB client.landedCost was passed an invalid callback');
			
			}
			else {
			
				this.landedCostCallback = callback;
				if ('undefined' == typeof lcRequest || 'object' != typeof lcRequest.items || !(Array.isArray(lcRequest.items)) || 'string' != typeof lcRequest.shipmentDestinationCountry) {
				
					throw new TypeError('FECB client.landedCost was passed an invalid request object');
				
				}
				else {
				
					let sdc = lcRequest.shipmentDestinationCountry.trim().toUpperCase().substring(0, 3);
					this.landedCostRequest = {
						language: this.language,
						partnerKey: this.merchantKey,
						shipmentDestinationCountry: isValidCountry(sdc) ? sdc : 'US'
					};
					this.landedCostRequestXml = '<partnerKey xsi:type="xsd:string">' + this.landedCostRequest.partnerKey + '</partnerKey>';
					this.landedCostRequestXml += '<language xsi:type="xsd:string">' + this.landedCostRequest.language + '</language>';
					this.landedCostRequestXml += '<shipmentDestinationCountry xsi:type="xsd:string">' + this.landedCostRequest.shipmentDestinationCountry + '</shipmentDestinationCountry>';
					this.landedCostRequestXml += '<items xsi:type="v4:ArrayOfProductInfo" soapenc:arrayType="v4:ProductInfo[]">';
					var landedCostItems = [];
					for (let i = 0; i < lcRequest.items.length; i++) {
					
						landedCostItems[i] = new ProductInfo(lcRequest.items[i].id, lcRequest.items[i].quantity, lcRequest.items[i].price, lcRequest.items[i].exportHub);
						this.landedCostRequestXml += landedCostItems[i].getXmlString();
					
					}
					this.landedCostRequestXml += '</items>';
					this.landedCostRequest.items = landedCostItems;
					if ('object' == typeof lcRequest.optionalArgs) {
					
						if ('string' == typeof lcRequest.optionalArgs.privateIndividuals) {
						
							let piValue = lcRequest.optionalArgs.privateIndividuals.trim().toUpperCase().substring(0,1);
							if (piValue === 'Y' || piValue === 'N') {
							
								this.landedCostRequest.privateIndividuals = piValue;
								this.landedCostRequestXml += '<privateIndividuals xsi:type="xsd:string">' + piValue + '</privateIndividuals>';
							
							}
						
						}
						if ('string' == typeof lcRequest.optionalArgs.shipmentDestinationAddress1) {
						
							this.landedCostRequest.shipmentDestinationAddress1 = lcRequest.optionalArgs.shipmentDestinationAddress1.trim().substring(0,250);
							this.landedCostRequestXml += '<shipmentDestinationAddress1 xsi:type="xsd:string">' + this.landedCostRequest.shipmentDestinationAddress1 + '</shipmentDestinationAddress1>';
						
						}
						if ('string' == typeof lcRequest.optionalArgs.shipmentDestinationAddress2) {
						
							this.landedCostRequest.shipmentDestinationAddress2 = lcRequest.optionalArgs.shipmentDestinationAddress2.trim().substring(0,250);
							this.landedCostRequestXml += '<shipmentDestinationAddress2 xsi:type="xsd:string">' + this.landedCostRequest.shipmentDestinationAddress2 + '</shipmentDestinationAddress2>';
						
						}
						if ('string' == typeof lcRequest.optionalArgs.shipmentDestinationCity) {
						
							this.landedCostRequest.shipmentDestinationCity = lcRequest.optionalArgs.shipmentDestinationCity.trim().substring(0,50);
							this.landedCostRequestXml += '<shipmentDestinationCity xsi:type="xsd:string">' + this.landedCostRequest.shipmentDestinationCity + '</shipmentDestinationCity>';
						
						}
						if ('string' == typeof lcRequest.optionalArgs.shipmentDestinationStateOrProvince) {
						
							this.landedCostRequest.shipmentDestinationStateOrProvince = lcRequest.optionalArgs.shipmentDestinationStateOrProvince.trim().substring(0,50);
							this.landedCostRequestXml += '<shipmentDestinationStateOrProvince xsi:type="xsd:string">' + this.landedCostRequest.shipmentDestinationStateOrProvince + '</shipmentDestinationStateOrProvince>';
						
						}
						if ('string' == typeof lcRequest.optionalArgs.shipmentDestinationZip) {
						
							this.landedCostRequest.shipmentDestinationZip = lcRequest.optionalArgs.shipmentDestinationZip.trim().substring(0,50);
							this.landedCostRequestXml += '<shipmentDestinationZip xsi:type="xsd:string">' + this.landedCostRequest.shipmentDestinationZip + '</shipmentDestinationZip>';
						
						}
						if ('number' == typeof lcRequest.optionalArgs.domesticShippingCost) {
						
							this.landedCostRequest.domesticShippingCost = parseFloat(lcRequest.optionalArgs.domesticShippingCost).toFixed(4);
							this.landedCostRequestXml += '<domesticShippingCost xsi:type="xsd:float">' + this.landedCostRequest.domesticShippingCost + '</domesticShippingCost>';
						
						}
						if ('number' == typeof lcRequest.optionalArgs.insuranceFlag) {
						
							if (!(isNaN(parseInt(lcRequest.optionalArgs.insuranceFlag))) && (parseInt(lcRequest.optionalArgs.insuranceFlag) === 0 || parseInt(lcRequest.optionalArgs.insuranceFlag) === 1)) {
							
								this.landedCostRequest.domesticShippingCost = parseInt(lcRequest.optionalArgs.domesticShippingCost);
								this.landedCostRequestXml += '<domesticShippingCost xsi:type="xsd:int">' + this.landedCostRequest.domesticShippingCost + '</domesticShippingCost>';
							
							}
						
						}
						if ('string' == typeof lcRequest.optionalArgs.orderValuationCurrency && isValidCurrency(lcRequest.optionalArgs.shipmentDestinationAddress2.trim().substring(0,3).toUpperCase())) {
						
							this.landedCostRequest.orderValuationCurrency = lcRequest.optionalArgs.shipmentDestinationAddress2.trim().substring(0,3).toUpperCase();
							this.landedCostRequestXml += '<orderValuationCurrency xsi:type="xsd:string">' + this.landedCostRequest.orderValuationCurrency + '</orderValuationCurrency>';
						
						}
						if ('string' == typeof lcRequest.optionalArgs.requestedCostReturnedCurrency && isValidCurrency(lcRequest.optionalArgs.shipmentDestinationAddress2.trim().substring(0,3).toUpperCase())) {
						
							this.landedCostRequest.requestedCostReturnedCurrency = lcRequest.optionalArgs.shipmentDestinationAddress2.trim().substring(0,3).toUpperCase();
							this.landedCostRequestXml += '<requestedCostReturnedCurrency xsi:type="xsd:string">' + this.landedCostRequest.requestedCostReturnedCurrency + '</requestedCostReturnedCurrency>';
						
						}
						if ('number' == typeof lcRequest.optionalArgs.service) {
						
							if (!(isNaN(parseInt(lcRequest.optionalArgs.service))) && (parseInt(lcRequest.optionalArgs.service) === 0 || parseInt(lcRequest.optionalArgs.service) === 1 || parseInt(lcRequest.optionalArgs.service) === 2)) {
							
								this.landedCostRequest.service = parseInt(lcRequest.optionalArgs.service);
								this.landedCostRequestXml += '<service xsi:type="xsd:int">' + this.landedCostRequest.service+ '</service>';
							
							}
						
						}
					
					}
					this.performRequest('ConnectLandedCost', this.landedCostRequestXml, function(error, response, body) {
					
						if (error) {
						
							return this.landedCostCallback(error, null);
						
						}
						else {
						
							var justTheBody = body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectLandedCostResponse'].return;
							delete justTheBody['xsi:type'];
							var bodyError = ('undefined' != typeof justTheBody.error) ? xmlNodeValue(justTheBody.error) : 0;
							if (bodyError != 0) {
							
								var eMessage = 'Code ' + parseInt(bodyError);
								if ('string' == typeof xmlNodeValue(justTheBody.errorMessage)) {
								
									eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage);
								
								}
								error = new Error(eMessage);
								return this.landedCostCallback(error, null);
							
							}
							else {
							
								var bodyObj = {
									error: parseInt(bodyError),
									errorMessage: ('string' == typeof xmlNodeValue(justTheBody.errorMessage)) ? xmlNodeValue(justTheBody.errorMessage) : '',
									errorMessageDetail: ('string' == typeof xmlNodeValue(justTheBody.errorMessage)) ? xmlNodeValue(justTheBody.errorMessage) : ''
								};
								
								if ('undefined' != typeof justTheBody.dutyCost) {
								
									bodyObj.dutyCost = parseFloat(xmlNodeValue(justTheBody.dutyCost['_']));
								
								}
								if ('undefined' != typeof justTheBody.taxCost) {
								
									bodyObj.taxCost = parseFloat(xmlNodeValue(justTheBody.taxCost));
								
								}
								if ('undefined' != typeof justTheBody.shippingCost) {
								
									bodyObj.shippingCost = parseFloat(xmlNodeValue(justTheBody.shippingCost));
								
								}
								if ('undefined' != typeof justTheBody.insuranceCost) {
								
									bodyObj.insuranceCost = parseFloat(xmlNodeValue(justTheBody.insuranceCost));
								
								}
								if ('undefined' != typeof justTheBody.ddpAvailable) {
								
									bodyObj.ddpAvailable = parseInt(xmlNodeValue(justTheBody.ddpAvailable));
								
								}
								if ('undefined' != typeof justTheBody.landedCostTransactionId) {
								
									bodyObj.landedCostTransactionId = xmlNodeValue(justTheBody.landedCostTransactionId).toString();
								
								}
								if ('undefined' != typeof justTheBody.orderValuationCurrencyCode) {
								
									bodyObj.orderValuationCurrencyCode = xmlNodeValue(justTheBody.orderValuationCurrencyCode).toString();
								
								}
								if ('undefined' != typeof justTheBody.orderValuationCurrencyExchangeRate) {
								
									bodyObj.orderValuationCurrencyExchangeRate = xmlNodeValue(justTheBody.orderValuationCurrencyExchangeRate).toString();
								
								}
								if ('undefined' != typeof justTheBody.requestedCostReturnedCurrencyCode) {
								
									bodyObj.requestedCostReturnedCurrencyCode = xmlNodeValue(justTheBody.requestedCostReturnedCurrencyCode).toString();
								
								}
								if ('undefined' != typeof justTheBody.requestedCostReturnedCurrencyExchangeRate) {
								
									bodyObj.requestedCostReturnedCurrencyExchangeRate = xmlNodeValue(justTheBody.requestedCostReturnedCurrencyExchangeRate).toString();
								
								}
								if ('object' == typeof justTheBody.items && Array.isArray(justTheBody.items.item)) {
								
									bodyObj.items = xmlObjectNodeArray(justTheBody.items.item, LandedProduct)
								
								}
								if (this.stripWrapper) {
							
									return this.landedCostCallback(false, bodyObj);
							
								}
								else {
							
									var landedCostResult = {
										"body": bodyObj,
										"statusCode": response.statusCode,
										"request": this.landedCostRequest
									};
									if (this.returnRaw) {
								
										landedCostResult.raw = response.body;
								
									}
									if (this.returnSoapHeader) {
								
										let soapHeader = body['SOAP-ENV:Envelope'];
										delete soapHeader['SOAP-ENV:Body'];
										landedCostResult.soapHeader = JSON.stringify(soapHeader);
								
									}
									if (this.returnFullResponse) {
								
										landedCostResult.response = response;
								
									}
									return this.landedCostResult(false, landedCostResult);
							
								}
							
							}
						
						}
					
					}.bind(this));
				
				}
			
			}
		
		}
		
		// callback = function w/ two arguments: (error, result)
		// oRequest = {
		//	orderNumber: 'string(100)',
		//	landedCostTransactionID
		//	shipToFirstName: 'string(100)',
		//	shipToLastName: 'string(100)',
		//	shipToAddress1: 'string',
		//	shipToCity: 'string(100)',
		//	shipToCountry: 'string(2)'
		//	ordersInfo: [
		//		{
		//			id: 'string',
		//			quantity: 'int',
		//			price: 'float(13,4)',
		//			currency: 'string(3),
		//			optionalArgs: {
		//				exportHub: 'string(3)',
		//				carrier: 'int(1)',
		//				trackingNumber: 'string(100)
		//			}
		//		}
		//	]
		// 	optionalArgs: {
		// 		shipToBusiness: 'string(250)',
		// 		shipToAddress2: 'string(250)',
		// 		shipToState: 'string(50)',
		// 		shipToZip: 'string(50)',
		// 		shipToPhone: 'string(50)',
		// 		shipToEmail: 'string',
		// 		shipToTaxID: 'string',
		// 		repackage: 'int(1); 0 (don't repackage), or 1 (repackage)',
		// 		dutyPaid: 'int(1); 0 (doesn't pay), or 1 (does pay)',
		// 		insurance: 'int(1); 0 (not insured), or 1 (insured)',
		// 		emailCustomerTracking: 'int(1); 0 (don't send link to customer), or 1 (send tracking link to customer)',
		// 		bongoCustomerService: 'int(1); 0 (don't show customer FECB support link/chat), or 1 (show customer FECB support link/chat)',
		//		sellingStoreName: 'string(100)',
		//		sellingStoreURL: 'string(250)',
		//		sellingStoreURLCS: 'string(250)',
		//		sellingStoreURLImage: 'string(250)'
		//		
		//	}
		// }
		order(oRequest, callback) {
		
			
		
		}
		
		orderTrackingUpdate(request, callback) {
		
		
		
		}
		
		orderRemove(request, callback) {
		
		
		
		}
		
		skuStatus(request, callback) {
		
		
		
		}
	
	},
	
	"clientPromise": class FedExCBClientPromise {
	
		constructor(args) {
		
			this.wsdlUri = fecbUri + '?wsdl';
			this.serviceUri = fecbUri;
			if ('string' != typeof args.language || 2 != args.language.trim().length) {
			
				throw new TypeError('FECB client constructor requires args.language to be a two character string');
			
			}
			else {
			
				this.language = isValidLanguage(args.language.trim().toLowerCase()) ? args.language.trim().toLowerCase() : 'en';
			
			}
			if ('string' != typeof args.merchantKey || 65 <= args.merchantKey.trim().length) {
			
				throw new TypeError('FECB client constructor requires args.merchantKey to be a string of 64 characters or fewer');
			
			}
			else {
			
				this.merchantKey = args.merchantKey.trim().substring(0, 64);
			
			}
			this.returnRaw = ('undefined' != typeof args.returnRaw && args.returnRaw) ? true : false;
			this.returnSoapHeader = ('undefined' != typeof args.returnSoapHeader && args.returnSoapHeader) ? true : false;
			this.stripWrapper = ('undefined' != typeof args.stripWrapper || !args.stripWrapper) ? false : true;
			this.returnFullResponse = ('undefined' != typeof args.returnFullResponse || !args.returnFullResponse) ? false : true;
		
		}
		
		performRequest(action, body) {
		
			this.performRequestXml = '<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v4="' + this.serviceUri + '" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"><soapenv:Header/><soapenv:Body><v4:' + action + ' soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><request xsi:type="v4:' + action + 'Request">' + body + '</request></v4:' + action + '></soapenv:Body></soapenv:Envelope>';
			var parser = new xml2js.Parser({explicitArray: false, trim: true, mergeAttrs: true});
			return parser.parseStringAsync(this.performRequestXml)
			.then((result) => {

				var requestOptions = {
					uri: this.serviceUri,
					method: 'POST',
					body: this.performRequestXml,
					encoding: 'utf8',
					gzip: true,
					headers: {
						'Content-Type': 'text/xml;charset=UTF-8',
						'Accept-Encoding': 'gzip,deflate',
						'Content-Length': this.performRequestXml.length,
						'SOAPAction': 'https://api.crossborder.fedex.com/services/v4.4#' + action
					},
					resolveWithFullResponse: true,
					simple: false
				};
				return requestAsync(requestOptions);
		
			}).then((response) => {
				
				return parser.parseStringAsync(body);
			
			}).then((parsedBody) => {
		
				return Promise.resolve({response: response, body: parsedBody});
		
			}).catch((error) => {
			
				return Promise.resolve({response: response, parseError: error});
			
			});
		
		}
		
		productInfo(itemsArray) {
		
			this.productInfoItems = [];
			var xmlItems = '';
			if ('object' == typeof itemsArray && Array.isArray(itemsArray) && 0 < itemsArray.length) {
		
				for (let i = 0; i < itemsArray.length; i++) {
			
					var optionalArgs = ('object' == typeof itemsArray[i].optionalArgs && null !== itemsArray[i].optionalArgs) ? itemsArray[i].optionalArgs : null;
					var itemInformation = ('object' == typeof itemsArray[i].itemInformation && null !== itemsArray[i].itemInformation) ? new CartonsDat(itemsArray[i].itemInformation.l, itemsArray[i].itemInformation.w, itemsArray[i].itemInformation.h, itemsArray[i].itemInformation.wt) : new CartonsDat(null,null,null,null);
					var productInfoObj = new ProductInfoDat(itemsArray[i].id, itemsArray[i].description, itemsArray[i].price, itemsArray[i].currency, itemsArray[i].exportHub, itemsArray[i].origin, itemInformation, optionalArgs);
					this.productInfoItems.push(productInfoObj);
					xmlItems += productInfoObj.getXmlString();
			
				}

				this.productInfoRequest = {
					items: this.productInfoItems,
					language: this.language,
					partnerKey: this.merchantKey
				};
				this.productInfoRequestXML = '<partnerKey xsi:type="xsd:string">' + this.productInfoRequest.partnerKey + '</partnerKey>';
				this.productInfoRequestXML += '<language xsi:type="xsd:string">' + this.productInfoRequest.language + '</language>';
				this.productInfoRequestXML += '<items xsi:type="v4:ArrayOfProductInfoDat" soapenc:arrayType="v4:ProductInfoDat[]">' + xmlItems + '</items>';
				debugger;
				return this.performRequest('ConnectProductInfo', this.productInfoRequestXML)
				.then((resultObject) => {

					var justTheBody = 'undefined' == typeof resultObject.body ? false : body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectProductInfoResponse'].return;
					if (justTheBody) {
						delete justTheBody['xsi:type'];
						var bodyError = ('undefined' != typeof justTheBody.error) ? xmlNodeValue(justTheBody.error) : 0;
						if (bodyError != 0) {
				
							var eMessage = 'Code ' + parseInt(bodyError);
							if ('string' == typeof xmlNodeValue(justTheBody.errorMessage)) {
					
								eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage);
					
							}
							error = new Error(eMessage);
							return Promise.reject(error);
				
						}
						else {
				
							var bodyObj = {
								error: parseInt(bodyError),
								errorMessage: xmlNodeValue(justTheBody.errorMessage),
								errorMessageDetail: xmlNodeValue(justTheBody.errorMessageDetail)
							};
							if (this.stripWrapper) {
				
								return this.productInfoCallback(false, bodyObj);
				
							}
							else {
				
								var productInfoResult = {
									"body": bodyObj,
									"statusCode": resultObject.response.statusCode,
									"request": this.productInfoRequest
								};
								if (this.returnRaw) {
					
									productInfoResult.raw = resultObject.response.body;
					
								}
								if (this.returnSoapHeader) {
					
									let soapHeader = body['SOAP-ENV:Envelope'];
									delete soapHeader['SOAP-ENV:Body'];
									productInfoResult.soapHeader = JSON.stringify(soapHeader);
					
								}
								if (this.returnFullResponse) {
					
									productInfoResult.response = response;
					
								}
								return Promise.resolve(productInfoResult);
				
							}
				
						}
					}
					else {
					
						return Promise.reject(resultObject);
					
					}
			
				}).catch((error) => {
				
					return Promise.reject(error);
				
				});
		
			}
			else {
		
				return Promise.reject(new TypeError('FECB client.productInfo was passed an invalid array of items'));
		
			}
		
		}
		
		landedCost(request) {
		
		
		
		}
		
		order(request) {
		
		
		
		}
		
		orderTrackingUpdate(request) {
		
		
		
		}
		
		orderRemove(request) {
		
		
		
		}
		
		skuStatus(request) {
		
		
		
		}
	
	},
	
	//classes
	"cartonsDat": CartonsDat,
	
	"productInfoDat": ProductInfoDat,
	
	"productInfo": ProductInfo,
	
	"orderInformation": OrderInformation,
	
	"trackingList": TrackingList,
	
	"productsIdDat": ProductsIdDat,
	
	//constants
	"exportHubs": exportHubArray,
	
	"countryCodes": countryCodeArray,
	
	"languages": languageArray,
	
	"carriers": carriers,
	
	//functions
	"validateLanguage": isValidLanguage,
	
	"validateCountry": isValidCountry,
	
	"validateCurrency": isValidCurrency,
	
	"getCountryForHub": getHubCountry,
	
	"getCarrierCode": getCarrierCode

};
