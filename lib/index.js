'use_strict'
const fecbWsdlUri = 'https://api.crossborder.fedex.com/services/v4.4?wsdl';
const soap = require('soap');
const xml2js = require('xml2js');

class CountryCode {

	constructor(code, name, currency) {
	
		this.name = ('string' != typeof name || null === name) ? null : name;
		this.code = ('string' != typeof code || null === code) ? null : code.substring(0, 1).toUpperCase();
		this.currency = ('string' != typeof currency || null === currency) ? null : currency.substring(0, 2).toUpperCase();
	
	}

}

class ExportHub {

	constructor(facilityCode, countryCode) {
	
		this.facility = ('string' != typeof facilityCode || null === facilityCode) ? null : facilityCode.substring(0, 2).toUpperCase();
		this.country = ('string' != typeof countryCode || null === countryCode) ? null : facilityCode.substring(0, 1).toUpperCase()
	
	}

}

class CartonsDat {

	constructor(lengthIn, widthIn, heightIn, weightLb) {
	
		this.L = 'number' == typeof lengthIn ? null : parseFloat(lengthIn.toFixed(4));
		this.W = 'number' == typeof widthIn ? null : parseFloat(widthIn.toFixed(4));
		this.H = 'number' == typeof heightIn ? null : parseFloat(heightIn.toFixed(4));
		this.WT = 'number' == typeof weightLb ? null : parseFloat(weightLb.toFixed(4));
	
	}

}

class ProductInfoDat {

	constructor(id, description, price, currency, exportHub, origin, itemInformation, optionalArgs) {
	
		if ('string' != typeof id || 'string' != typeof description || 'number' != typeof price || 'string' != typeof currency || 'string' != typeof exportHub || 'string' != typeof origin || 'object' != typeof itemInformation || !(itemInformation instanceof CartonsDat)) {
		
			throw new TypeError('Invalid parameter type passed to ProductInfoDat constructor');
		
		}
		else {
		
			this.productID = id.substring(0,254);
			this.description = description.substring(0,249);
			this.price = (null === price || isNaN(price)) ? 0.0000 : parseFloat(price.toFixed(4));
			currency = currency.substring(0, 2).toUpperCase();
			this.itemValuationCurrency = ('string' == typeof currency && isValidCurrency(currency)) ? currency : 'USD';
			exportHub = exportHub.substring(0, 2).toUpperCase();
			var hubCountry = getHubCountry(exportHub);
			this.itemExportHubCountry('string' == typeof exportHub && hubCountry) ? hubCountry : 'US';
			origin = origin.substring(0, 1).toUpperCase();
			this.countryOfOrigin = ('string' == typeof origin && isValidCurrency(origin)) ? origin : 'US';
			this.itemInformation = ('object' == typeof itemInformation && itemInformation instanceof CartonsDat) ? itemInformation : new CartonsDat();
			if ('object' == typeof optionalArgs && null !== optionalArgs) {
			
				if ('string' == typeof optionalArgs.productName) {
				
					this.productName = optionalArgs.productName.substring(0,254);
				
				}
				if ('string' == typeof optionalArgs.url) {
				
					this.url = optionalArgs.url.substring(0,254);
				
				}
				if ('string' == typeof optionalArgs.imageUrl) {
				
					this.imageUrl == optionalArgs.imageUrl.substring(0,254);
				
				}
				if ('string' == typeof optionalArgs.hsCode) {
				
					this.hsCode = optionalArgs.hsCode.substring(0,14);
				
				}
				if ('string' == typeof optionalArgs.eccn) {
				
					this.eccn = optionalArgs.eccn.substring(0,14);
				
				}
				if ('undefined' != typeof optionalArgs.hazFlag && null !== optionalArgs.hazFlag) {
				
					this.hazFlag = (optionalArgs.hazFlag && 'false' !== optionalArgs.hazFlag.toString().trim().toLowerCase()) ? 1 : 0;
				
				}
				if ('string' == typeof optionalArgs.licenseFlag) {
				
					var validCountries = [];
					var licenseCountries = optionalArgs.licenseFlag.split(',');
					for (let i = 0; i < licenseCountries.length; i++) {
					
						let currentCountry = licenseCountries[i].trim().substring(0,1).toUpperCase();
						if (isValidCountry(currentCountry)) {
						
							validCountries.push(currentCountry);
						
						}
					
					}
					this.licenseFlag = validCountries.toString();
				
				}
				if ('object' == typeof optionalArgs.licenseFlag && optionalArgs.licenseFlag.isArray()) {
				
					var validCountries = [];
					for (let i = 0; i < optionalArgs.licenseFlag.length; i++) {
					
						let currentCountry = optionalArgs.licenseFlag[i].toString().trim().substring(0,1).toUpperCase();
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
					
						let currentCountry = licenseCountries[i].trim().substring(0,1).toUpperCase();
						if (isValidCountry(currentCountry)) {
						
							validCountries.push(currentCountry);
						
						}
					
					}
					this.importFlag = validCountries.toString();
				
				}
				if ('object' == typeof optionalArgs.importFlag && optionalArgs.importFlag.isArray()) {
				
					var validCountries = [];
					for (let i = 0; i < optionalArgs.importFlag.length; i++) {
					
						let currentCountry = optionalArgs.importFlag[i].toString().trim().substring(0,1).toUpperCase();
						if (isValidCountry(currentCountry)) {
						
							validCountries.push(currentCountry);
						
						}
					
					}
					this.importFlag = validCountries.toString();
				
				}
				if ('string' == typeof optionalArgs.productType) {
				
					this.productType = optionalArgs.productType.substring(0,254);
				
				}
			
			}
		
		}
	
	}

}

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

function isValidCurrency(currencyCode) {

	let i = 0;
	var isValid = false;
	do {
	
		if (currencyCode == countryCodeArray[i].currency) {
		
			isValid = true;
		
		}
		i++;
	
	}
	while(i < countryCodeArray.length && !isValid);
	return isValid;

}

function isValidCountry(countryCode) {

	let i = 0;
	var isValid = false;
	do {
	
		if (countryCode == countryCodeArray[i].code) {
		
			isValid = true;
		
		}
		i++;
	
	}
	while(i < countryCodeArray.length && !isValid);
	return isValid;

}

function getHubCountry(facilityCode) {

	let i = 0;
	var countryCode = false;
	do {
	
		if (facilityCode == exportHubArray[i].facilityCode) {
		
			countryCode = exportHubArray[i].countryCode;
		
		}
		i++;
	
	}
	while(i < countryCodeArray.length && !countryCode);
	return countryCode;

}

function isValidLanguage(languageCode) {

	var isValid = false;
	if (-1 !== languageArray.indexOf(languageCode.substring(0,1).toLowerCase())) {
	
		isValid = true;
	
	}
	return isValid;

}

module.exports = {

	"client": class FedExCBClient {
	
		constructor(args) {
		
			this.wsdlUri = fecbWsdlUri;
			if ('string' != typeof args.language || 2 != args.language.trim().length) {
			
				throw new TypeError('FECB client constructor requires args.language to be a two character string');
			
			}
			else {
			
				this.language = isValidLanguage(args.language.trim().toLowerCase()) ? 'en' : args.language.trim().toLowerCase();
			
			}
			if ('string' != typeof args.merchantKey || 46 <= args.merchantKey.trim().length) {
			
				throw new TypeError('FECB client constructor requires args.merchantKey to be a string of 45 characters or fewer');
			
			}
			else {
			
				this.merchantKey = args.merchantKey.trim().substring(0,24);
			
			}
			this.returnRaw = ('undefined' != typeof args.returnRaw && args.returnRaw) ? true : false;
			this.returnSoapHeader = ('undefined' != typeof args.returnSoapHeader && args.returnSoapHeader) ? true : false;
			this.stripWrapper = ('undefined' != typeof args.stripWrapper && !args.stripWrapper) ? false : true;
		
		}
		
		productInfo(request, callback) {
		
			if ('function' != typeof callback || callback.length !== 2) {
			
				throw new TypeError('FECB client.productInfo was passed an invalid callback');
			
			}
			else {
			
				this.productInfoCallback = callback;
				this.productInfoItems = [];
				if ('object' == typeof request && request.isArray() && 1 >= request.length) {
				
					for (let i = 0; i < request.length; i++) {
					
						var optionalArgs = ('object' == typeof request[i].optionalArgs && null !== request[i].optionalArgs) ? request[i].optionalArgs : null;
						var itemInformation = ('object' == typeof request[i].itemInformation && null !== request[i].itemInformation) ? new CartonsDat(request[i].itemInformation.L, request[i].itemInformation.W, request[i].itemInformation.H, request[i].itemInformation.WT) : new CartonsDat(null,null,null,null);
						this.productInfoItems.push(new ProductInfoDat(request[i].id, request[i].description, request[i].price, request[i].currency, request[i].exportHub, request[i].origin, itemInformation, optionalArgs));
					
					}
					soap.createClient(this.wsdlUri, function(error, fecbClient) {
			
						if (error) {
				
							return this.productInfoCallback(error, null);
				
						}
						else {
				
							var args = {
								items: this.productInfoItems,
								language: this.language,
								merchantKey: this.merchantKey
							};
							fecbClient.ConnectProductInfo(args, function(error, response, raw, soapHeader) {
							
								if (error) {
								
									return this.productInfoCallback(error, null);
								
								}
								else {
								
									if (this.stripWrapper) {
									
										return this.productInfoCallback(false, response);
									
									}
									else {
									
										var productInfoResult = {
											"response": response
										};
										if (this.returnRaw) {
										
											productInfoResult.raw = raw;
										
										}
										if (this.returnSoapHeader) {
										
											productInfoResult.soapHeader = soapHeader;
										
										}
										return this.productInfoCallback(false, productInfoResult);
									
									}
								
								}
							
							}.bind(this));
				
						}
			
					}.bind(this));
				
				}
				else {
				
					throw new TypeError('FECB client.productInfo was passed an invalid array of items');
				
				}
			
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
	
	"clientAsync": class FedExCBClientAsync {
	
		constructor(args) {
		
		
		
		}
	
	},
	
	//classes
	"carton": CartonsDat,
	
	"productInfo": ProductInfoDat,
	
	//constants
	"exportHubs": exportHubArray,
	
	"countryCodes": countryCodeArray,
	
	"languages": languageArray,
	
	//functions
	"validateLanguage": isValidLanguage,
	
	"validateCountry": isValidCountry,
	
	"validateCurrency": isValidCurrency,
	
	"getCountryForHub": getHubCountry
	

};
