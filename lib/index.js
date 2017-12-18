/* jshint esversion: 6 */
/* globals require, module */
'use_strict'

/*****
* Application constants and requires
*****/

const fecbUri = 'https://api.crossborder.fedex.com/services/v4.4'
// Const soap = require('soap');
const Promise = require('bluebird')
const request = require('request')
const requestAsync = require('request-promise')
const xml2js = Promise.promisifyAll(require('xml2js'))
const util = require('util')

/*****
* Base Class for XML Output Objects
*****/

class XmlOutputObject {
  constructor (objectName) {
    this.xmlObjectName = objectName
  }

  getXmlString () {
    var xmlOutputObjectValues = Object.keys(this)
    var xmlOutputObjectXml = '<item xsi:type="v4:' + this.xmlObjectName + '">'
    for (let i = 0; i < xmlOutputObjectValues.length; i++) {
      if (this.hasOwnProperty(xmlOutputObjectValues[i]) && typeof xmlOutputObjectValues[i] !== 'function' && xmlOutputObjectValues[i] !== 'xmlObjectName') {
        xmlOutputObjectXml += '<' + xmlOutputObjectValues[i] + '>' + this[xmlOutputObjectValues[i]] + '</' + xmlOutputObjectValues[i] + '>'
      }
    }
    xmlOutputObjectXml += '</item>'
    return xmlOutputObjectXml
  }
}

/*****
* Exported classes (used for interface requests and input)
*****/

class CountryCode {
  constructor (code, name, currency) {
    this.name = (typeof name !== 'string' || name === null) ? null : name
    this.code = (typeof code !== 'string' || code === null) ? null : code.substring(0, 2).toUpperCase()
    this.currency = (typeof currency !== 'string' || currency === null) ? null : currency.substring(0, 3).toUpperCase()
  }
}

class ExportHub {
  constructor (facilityCode, countryCode) {
    this.facility = (typeof facilityCode !== 'string' || facilityCode === null) ? null : facilityCode.substring(0, 3).toUpperCase()
    this.country = (typeof countryCode !== 'string' || countryCode === null) ? null : countryCode.substring(0, 2).toUpperCase()
  }
}

class CartonsDat extends XmlOutputObject {
  constructor (lengthIn, widthIn, heightIn, weightLb) {
    super('CartonsDat')
    if ((typeof lengthIn !== 'undefined' || lengthIn === null || typeof widthIn !== 'undefined' || widthIn === null || typeof heightIn !== 'undefined' || heightIn === null) && (typeof weightLb !== 'undefined' || weightLb === null)) {
      throw new TypeError('Both dimensions and weight are missing from CartonsDat. Contructor requires l,w,&h or weight at a minimum')
    } else {
      this.l = typeof lengthIn === 'number' ? null : parseFloat(lengthIn).toFixed(4)
      this.w = typeof widthIn === 'number' ? null : parseFloat(widthIn).toFixed(4)
      this.h = typeof heightIn === 'number' ? null : parseFloat(heightIn).toFixed(4)
      this.wt = typeof weightLb === 'number' ? null : parseFloat(weightLb).toFixed(4)
    }
  }
}

class ProductInfoDat extends XmlOutputObject {
  constructor (id, description, price, currency, exportHub, origin, itemInformation, optionalArgs) {
    super('ProductInfoDat')
    if (typeof id !== 'string' || typeof description !== 'string' || typeof price !== 'number' || typeof currency !== 'string' || typeof exportHub !== 'string' || typeof origin !== 'string' || typeof itemInformation !== 'object') {
      throw new TypeError('Invalid parameter type passed to ProductInfoDat constructor')
    } else {
      this.productID = id.substring(0, 255)
      this.description = description.substring(0, 245)
      this.price = (price === null || isNaN(price)) ? 0.0000 : parseFloat(price.toFixed(4))
      currency = currency.substring(0, 3).toUpperCase()
      this.itemValuationCurrency = (typeof currency === 'string' && isValidCurrency(currency)) ? currency : 'USD'
      exportHub = exportHub.substring(0, 3).toUpperCase()
      var hubCountry = getHubCountry(exportHub)
      this.itemExportHubCountry = (typeof hubCountry === 'string' && hubCountry) ? hubCountry : 'US'
      origin = origin.substring(0, 2).toUpperCase()
      this.countryOfOrigin = (typeof origin === 'string' && isValidCountry(origin)) ? origin : 'US'
      var itemInfoArray = [
        (typeof itemInformation.l === 'undefined') ? null : itemInformation.l,
        (typeof itemInformation.w === 'undefined') ? null : itemInformation.w,
        (typeof itemInformation.h === 'undefined') ? null : itemInformation.h,
        (typeof itemInformation.wt === 'undefined') ? null : itemInformation.wt
      ]
      this.itemInformation = (typeof itemInformation === 'object' && itemInformation instanceof CartonsDat) ? itemInformation : new CartonsDat(...itemInfoArray)
      if (typeof optionalArgs === 'object' && optionalArgs !== null) {
        let productInfoDatOptionalArgs = {
          productName: 'string',
          url: 'string',
          imageUrl: 'string',
          hsCode: 'string10',
          eccn: 'string15',
          hazFlag: 'intBool',
          licenseFlag: 'csvStringCountry',
          importFlag: 'csvStringCountry'
        }

        for (let optArgName in productInfoDatOptionalArgs) {
          if (optArgName === 'hazFlag') {
            setPropertyIf(optionalArgs, this, optArgName, productInfoDatOptionalArgs[optArgName], 0)
          } else {
            setPropertyIf(optionalArgs, this, optArgName, productInfoDatOptionalArgs[optArgName])
          }
        }
      } else {
        this.hazFlag = 0
      }
    }
  }
}

class ProductInfo extends XmlOutputObject {
  constructor (id, quantity, price, exportHub) {
    super('ProductInfo')
    if (typeof id !== 'string' || typeof quantity === 'undefined' || isNaN(parseInt(quantity)) || typeof price !== 'number' || typeof exportHub !== 'string') {
      throw new TypeError('Invalid parameter type passed to ProductInfo constructor')
    } else {
      this.productID = id.substring(0, 255)
      this.quantity = (quantity === null || isNaN(quantity)) ? 0 : parseInt(quantity)
      this.price = (price === null || isNaN(price)) ? 0.0000 : parseFloat(price.toFixed(4))
      var hubCountry = getHubCountry(exportHub)
      this.itemExportHubCountry = (typeof hubCountry === 'string' && hubCountry) ? hubCountry : 'US'
    }
  }
}

// Carrier mapping:
// 1=UPS, 2=FedEx, 3=DHL, 4=USPS, 5=EMS, 6=Other
class OrderInformation extends XmlOutputObject {
  constructor (id, quantity, price, currency, optionalArgs) {
    super('OrderInformation')
    if (typeof id !== 'string' || typeof quantity === 'undefined' || isNaN(parseInt(quantity)) || typeof price !== 'number' || typeof currency !== 'string') {
      throw new TypeError('Invalid parameter type passed to OrderInformation constructor')
    } else {
      this.productID = id.substring(0, 255)
      this.quantity = (quantity === null || isNaN(quantity)) ? 0 : parseInt(quantity)
      this.price = (price === null || isNaN(price)) ? 0.0000 : parseFloat(price.toFixed(4))
      currency = currency.trim().substring(0, 3).toUpperCase()
      this.orderValuationCurrency = (typeof currency === 'string' && isValidCurrency(currency)) ? currency : 'USD'
      if (typeof optionalArgs === 'object' && optionalArgs !== null) {
        if (typeof optionalArgs.exportHub === 'string') {
          var hubCountry = getHubCountry(optionalArgs.exportHub.trim())
          this.itemExportHubCountry = (typeof hubCountry === 'string' && hubCountry) ? hubCountry : 'US'
        }
        if (typeof optionalArgs.carrier !== 'undefined') {
          var currentInt = parseInt(optionalArgs.carrier)
          if (isNaN(currentInt)) {
            currentInt = getCarrierCode(optionalArgs.carrier)
          } else {
            currentInt = (currentInt > 0 && currentInt < 6) ? currentInt : 6
          }
          this.carrier = currentInt.toString()
        }
        if (typeof optionalArgs.trackingNumber === 'string') {
          this.trackingNumber = optionalArgs.trackingNumber.trim().substring(0, 100)
        }
      }
    }
  }
}

class TrackingList extends XmlOutputObject {
  // Carrier mapping:
  // 1=UPS, 2=FedEx, 3=DHL, 4=USPS, 5=EMS, 6=Other
  constructor (id, quantity, trackingNumber, carrier) {
    super('TrackingList')
    if (typeof id !== 'string' || typeof quantity === 'undefined' || isNaN(parseInt(quantity)) || typeof trackingNumber === 'undefined' || typeof carrier === 'undefined') {
      throw new TypeError('Invalid parameter type passed to TrackingList constructor')
    } else {
      this.productID = id.substring(0, 255)
      this.quantity = (quantity === null || isNaN(quantity)) ? 0 : parseInt(quantity)
      this.trackingNumber = trackingNumber.toString().substring(0, 255)
      var currentInt = 6
      var carrierString = ''
      if (typeof carrier === 'string') {
        if (carrier.indexOf(',') === -1) {
          currentInt = parseInt(carrier.trim())
          if (isNaN(currentInt)) {
            currentInt = getCarrierCode(carrier.trim())
          } else {
            currentInt = (currentInt > 0 && currentInt < 6) ? currentInt : 6
          }
          this.carrier = currentInt.toString()
        } else {
          var carrierArray = carrier.split(',')
          carrierString = ''
          for (let i = 0; i < carrierArray.length; i++) {
            currentInt = parseInt(carrierArray[i].trim())
            if (isNaN(currentInt)) {
              currentInt = getCarrierCode(carrierArray[i])
            } else {
              currentInt = (currentInt > 0 && currentInt < 6) ? currentInt : 6
            }
            carrierString += currentInt
            if ((i + 1) < carrierArray.length) {
              carrierString += ','
            }
          }
          this.carrier = carrierString
        }
      } else if (typeof carrier === 'number') {
        currentInt = parseInt(carrier)
        this.carrier = (currentInt > 0 && currentInt < 6) ? currentInt.toString() : '6'
      } else if (typeof carrier === 'object' && Array.isArray(carrier)) {
        carrierString = ''
        for (let i = 0; i < carrier.length; i++) {
          currentInt = parseInt(carrier[i].trim())
          if (isNaN(currentInt)) {
            currentInt = getCarrierCode(carrier[i])
          } else {
            currentInt = (currentInt > 0 && currentInt < 6) ? currentInt : 6
          }
          carrierString += currentInt
          if ((i + 1) < carrier.length) {
            carrierString += ','
          }
        }
        this.carrier = carrierString
      } else {
        this.carrier = 6
      }
    }
  }
}

class ProductsIdDat extends XmlOutputObject {
  constructor (id) {
    super('ProductsIdDat')
    if (typeof id !== 'string') {
      throw new TypeError('Invalid parameter type passed to ProductsIdDat constructor')
    } else {
      this.productID = id.substring(0, 255)
    }
  }
}

/*****
* Non-exported classes (used for validating responses)
*****/

class LandedProduct extends XmlOutputObject {
  constructor (errorMessage, productID, itemExportHubCountry, orderValuationCurrencyCode, calculated, dutyCost, taxCost, ddpAvailable) {
    super('LandedProduct')
    this.errorMessage = errorMessage
    this.productID = productID.substring(0, 255)
    this.itemExportHubCountry = itemExportHubCountry.substring(0, 2)
    this.orderValuationCurrencyCode = orderValuationCurrencyCode.substring(0, 3)
    calculated = parseInt(calculated)
    this.calculated = isNaN(calculated) ? 0 : calculated
    this.dutyCost = (dutyCost === null || isNaN(dutyCost)) ? 0.0000 : parseFloat(dutyCost.toFixed(4))
    this.taxCost = (taxCost === null || isNaN(taxCost)) ? 0.0000 : parseFloat(taxCost.toFixed(4))
    ddpAvailable = parseInt(ddpAvailable)
    this.ddpAvailable = isNaN(ddpAvailable) ? 0 : ddpAvailable
  }
}

class SkuStatusDat extends XmlOutputObject {
  constructor (productID, skuHsCode, productStatus) {
    super('SkuStatusDat')
    this.productID = (typeof productID === 'string') ? productID : ''
    this.skuHsCode = (!(isNaN(parseInt(skuHsCode)))) ? parseInt(skuHsCode) : null
    this.productStatus = (!(isNaN(parseInt(productStatus)))) ? parseInt(productStatus) : null
  }
}

/*****
* Exported constants
*****/

const exportHubArray = [
  new ExportHub('TPA', 'US'),
  new ExportHub('LGB', 'US'),
  new ExportHub('BRU', 'BE'),
  new ExportHub('LON', 'UK'),
  new ExportHub('LIM', 'PE')
]

const countryCodeArray = [
  new CountryCode('AF', 'Afghanistan', 'AFN'),
  new CountryCode('AL', 'Albania', 'ALL'),
  new CountryCode('DZ', 'Algeria', 'DZD'),
  new CountryCode('AS', 'American Samoa', 'USD'),
  new CountryCode('AD', 'Andorra', 'EUR'),
  new CountryCode('AO', 'Angola', 'AOA'),
  new CountryCode('AI', 'Anguilla', 'XCD'),
  new CountryCode('AG', 'Antigua', 'XCD'),
  new CountryCode('AR', 'Argentina', 'ARS'),
  new CountryCode('AM', 'Armenia', 'AMD'),
  new CountryCode('AW', 'Aruba', 'AWG'),
  new CountryCode('AU', 'Australia', 'AUD'),
  new CountryCode('AT', 'Austria', 'EUR'),
  new CountryCode('AZ', 'Azerbaijan', 'AZN'),
  new CountryCode('1F', 'Azores (Portugal) ', 'EUR'),
  new CountryCode('BS', 'Bahamas', 'BSD'),
  new CountryCode('BH', 'Bahrain', 'BHD'),
  new CountryCode('BD', 'Bangladesh', 'BDT'),
  new CountryCode('BB', 'Barbados', 'BBD'),
  new CountryCode('1A', 'Barbuda', 'XCD'),
  new CountryCode('BY', 'Belarus', 'EUR'),
  new CountryCode('BE', 'Belgium', 'EUR'),
  new CountryCode('BZ', 'Belize', 'BZD'),
  new CountryCode('BJ', 'Benin', 'XAF'),
  new CountryCode('BM', 'Bermuda', 'BMD'),
  new CountryCode('BT', 'Bhutan', 'BTN'),
  new CountryCode('BO', 'Bolivia', 'BOB'),
  new CountryCode('X1', 'Bonaire', null),
  new CountryCode('BA', 'Bosnia and Herzegovina', 'BHD'),
  new CountryCode('BW', 'Botswana', 'BWP'),
  new CountryCode('BR', 'Brazil', 'BRL'),
  new CountryCode('BN', 'Brunei', 'BND'),
  new CountryCode('BG', 'Bulgaria', 'BGN'),
  new CountryCode('BF', 'Burkina Faso', 'XAF'),
  new CountryCode('BI', 'Burundi', 'BIF'),
  new CountryCode('KH', 'Cambodia', 'KHR'),
  new CountryCode('CM', 'Cameroon', 'XAF'),
  new CountryCode('CA', 'Canada', 'CAD'),
  new CountryCode('X2', 'Canary Islands', 'EUR'),
  new CountryCode('CV', 'Cape Verde', 'CVE'),
  new CountryCode('KY', 'Cayman Islands', 'KYD'),
  new CountryCode('CF', 'Central African Republic', 'XAF'),
  new CountryCode('TD', 'Chad', 'XAF'),
  new CountryCode('CL', 'Chile', 'CLP'),
  new CountryCode('CN', 'China', 'CNY'),
  new CountryCode('CO', 'Colombia', 'COP'),
  new CountryCode('MP', 'Commonwealth No. Mariana Islands', 'USD'),
  new CountryCode('KM', 'Comoros Islands', 'KMF'),
  new CountryCode('CG', 'Congo', 'XAF'),
  new CountryCode('CD', 'Congo, Democratic Republic', 'XAF'),
  new CountryCode('CK', 'Cook Islands', 'NZD'),
  new CountryCode('CR', 'Costa Rica', 'CRC'),
  new CountryCode('HR', 'Croatia', 'HRK'),
  new CountryCode('CW', 'Curacao', null),
  new CountryCode('CY', 'Cyprus', 'EUR'),
  new CountryCode('CZ', 'Czech Republic', 'CZK'),
  new CountryCode('DK', 'Denmark', 'DKK'),
  new CountryCode('DJ', 'Djibouti', 'DJF'),
  new CountryCode('DM', 'Dominica', 'XCD'),
  new CountryCode('DO', 'Dominican Republic', 'DOP'),
  new CountryCode('TP', 'East Timor', 'USD'),
  new CountryCode('EC', 'Ecuador', 'USD'),
  new CountryCode('EG', 'Egypt', 'EGP'),
  new CountryCode('SV', 'El Salvador', 'SVC'),
  new CountryCode('1D', 'England (U.K)', 'GBP'),
  new CountryCode('GQ', 'Equatorial Guinea', 'XAF'),
  new CountryCode('ER', 'Eritrea', 'RUB'),
  new CountryCode('EE', 'Estonia', 'EEK'),
  new CountryCode('ET', 'Ethiopia', 'ETB'),
  new CountryCode('FK', 'Falkland Islands', 'FKP'),
  new CountryCode('FO', 'Faroe Islands', 'DKK'),
  new CountryCode('FJ', 'Fiji Islands', 'FJD'),
  new CountryCode('FI', 'Finland', 'EUR'),
  new CountryCode('FR', 'France', 'EUR'),
  new CountryCode('GF', 'French Guiana', 'EUR'),
  new CountryCode('PF', 'French Polynesia', 'EUR'),
  new CountryCode('GA', 'Gabon', 'XAF'),
  new CountryCode('GM', 'Gambia', 'GMD'),
  new CountryCode('GE', 'Georgia', 'GEL'),
  new CountryCode('DE', 'Germany', 'EUR'),
  new CountryCode('GH', 'Ghana', 'GHS'),
  new CountryCode('GI', 'Gibraltar', 'GBP'),
  new CountryCode('GR', 'Greece', 'EUR'),
  new CountryCode('GL', 'Greenland', 'DKK'),
  new CountryCode('GD', 'Grenada', 'XCD'),
  new CountryCode('GP', 'Guadeloupe', 'EUR'),
  new CountryCode('GU', 'Guam', 'USD'),
  new CountryCode('GT', 'Guatemala', 'GTQ'),
  new CountryCode('GG', 'Guernsey', 'GBP'),
  new CountryCode('GN', 'Guinea', 'GNF'),
  new CountryCode('GW', 'Guinea-Bissau', 'XAF'),
  new CountryCode('GY', 'Guyana', 'GYD'),
  new CountryCode('HT', 'Haiti', 'HTG'),
  new CountryCode('HN', 'Honduras', 'HNL'),
  new CountryCode('HK', 'Hong Kong', 'HKD'),
  new CountryCode('HU', 'Hungary', 'HUF'),
  new CountryCode('IS', 'Iceland', 'ISK'),
  new CountryCode('IN', 'India', 'INR'),
  new CountryCode('ID', 'Indonesia', 'IDR'),
  new CountryCode('IR', 'Iran', 'IRR'),
  new CountryCode('IQ', 'Iraq', 'IQD'),
  new CountryCode('1E', 'Ireland, Northern (U.K.)', 'EUR'),
  new CountryCode('IE', 'Ireland, Republic of', 'EUR'),
  new CountryCode('IL', 'Israel', 'ILS'),
  new CountryCode('IT', 'Italy', 'EUR'),
  new CountryCode('CI', 'Ivory Coast', null),
  new CountryCode('JM', 'Jamaica', 'JMD'),
  new CountryCode('JP', 'Japan', 'JPY'),
  new CountryCode('JE', 'Jersey', 'GBP'),
  new CountryCode('JO', 'Jordan', 'JOD'),
  new CountryCode('KZ', 'Kazakhstan', 'EUR'),
  new CountryCode('KE', 'Kenya', 'KES'),
  new CountryCode('KI', 'Kiribati', 'AUD'),
  new CountryCode('KR', 'Korea, Republic of', 'KRW'),
  new CountryCode('KP', 'Korea, The D.P.R of (North K.)', 'KPW'),
  new CountryCode('KV', 'Kosovo', 'EUR'),
  new CountryCode('KW', 'Kuwait', 'KWD'),
  new CountryCode('KG', 'Kyrgyzstan', 'KGS'),
  new CountryCode('LA', 'Laos', 'LAK'),
  new CountryCode('LV', 'Latvia', 'EUR'),
  new CountryCode('LB', 'Lebanon', 'LBP'),
  new CountryCode('LS', 'Lesotho', 'LSL'),
  new CountryCode('LR', 'Liberia', 'LRD'),
  new CountryCode('LY', 'Libya', 'LYD'),
  new CountryCode('LI', 'Liechtenstein', 'CHF'),
  new CountryCode('LT', 'Lithuania', 'LTL'),
  new CountryCode('LU', 'Luxembourg', 'EUR'),
  new CountryCode('MO', 'Macau', 'MOP'),
  new CountryCode('MK', 'Macedonia', 'MKD'),
  new CountryCode('MG', 'Madagascar', 'MYR'),
  new CountryCode('1G', 'Madeira (Portugal)', 'EUR'),
  new CountryCode('MW', 'Malawi', 'MWK'),
  new CountryCode('MY', 'Malaysia', 'MYR'),
  new CountryCode('MV', 'Maldives', 'MVR'),
  new CountryCode('ML', 'Mali', 'XAF'),
  new CountryCode('MT', 'Malta', 'EUR'),
  new CountryCode('MH', 'Marshall Islands', 'USD'),
  new CountryCode('MQ', 'Martinique', 'EUR'),
  new CountryCode('MR', 'Mauritania', 'MRO'),
  new CountryCode('MU', 'Mauritius', 'MUR'),
  new CountryCode('YT', 'Mayotte', 'EUR'),
  new CountryCode('MX', 'Mexico', 'MXN'),
  new CountryCode('FM', 'Micronesia', 'USD'),
  new CountryCode('MD', 'Moldova', 'MDL'),
  new CountryCode('MC', 'Monaco', 'EUR'),
  new CountryCode('MN', 'Mongolia', 'MNT'),
  new CountryCode('ME', 'Montenegro, Republica of', 'EUR'),
  new CountryCode('MS', 'Montserrat', 'XCD'),
  new CountryCode('MA', 'Morocco', 'MAD'),
  new CountryCode('MZ', 'Mozambique', 'MZN'),
  new CountryCode('MM', 'Myanmar (Burma)', 'MMK'),
  new CountryCode('NA', 'Namibia', 'ZAR'),
  new CountryCode('NR', 'Nauru, Republic of', 'AUD'),
  new CountryCode('NP', 'Nepal', 'NPR'),
  new CountryCode('NL', 'Netherlands, The', 'EUR'),
  new CountryCode('NK', 'Nevis', 'XCD'),
  new CountryCode('NC', 'New Caledonia', 'XPF'),
  new CountryCode('NZ', 'New Zealand', 'NZD'),
  new CountryCode('NI', 'Nicaragua', 'NIO'),
  new CountryCode('NE', 'Niger', 'XAF'),
  new CountryCode('NG', 'Nigeria', 'NGN'),
  new CountryCode('NU', 'Niue Island', 'NZD'),
  new CountryCode('NO', 'Norway', 'NOK'),
  new CountryCode('OM', 'Oman', 'OMR'),
  new CountryCode('PK', 'Pakistan', 'PKR'),
  new CountryCode('PW', 'Palau', 'USD'),
  new CountryCode('PS', 'Palestine', 'ILS'),
  new CountryCode('PA', 'Panama', 'PAB'),
  new CountryCode('PG', 'Papua New Guinea', 'PGK'),
  new CountryCode('PY', 'Paraguay', 'PYG'),
  new CountryCode('PE', 'Peru', 'PEN'),
  new CountryCode('PH', 'Philippines', 'PHP'),
  new CountryCode('PL', 'Poland', 'PLN'),
  new CountryCode('PT', 'Portugal', 'EUR'),
  new CountryCode('PR', 'Puerto Rico', 'USD'),
  new CountryCode('QA', 'Qatar', 'QAR'),
  new CountryCode('RE', 'Reunion Island', 'EUR'),
  new CountryCode('RO', 'Romania', 'EUR'),
  new CountryCode('RU', 'Russia', 'RUB'),
  new CountryCode('RW', 'Rwanda', 'RWF'),
  new CountryCode('AN', 'Saba', 'USD'),
  new CountryCode('X8', 'Saipan', null),
  new CountryCode('1M', 'Samoa', 'WST'),
  new CountryCode('SM', 'San Marino', 'EUR'),
  new CountryCode('ST', 'Sao Tome and Principe', 'STD'),
  new CountryCode('SA', 'Saudi Arabia', 'SAR'),
  new CountryCode('1C', 'Scotland (U.K)', 'GBP'),
  new CountryCode('SN', 'Senegal', 'XAF'),
  new CountryCode('RS', 'Serbia, Republic of', 'RSD'),
  new CountryCode('SC', 'Seychelles', 'SCR'),
  new CountryCode('SL', 'Sierra Leone', 'SLL'),
  new CountryCode('SG', 'Singapore', 'SGD'),
  new CountryCode('SK', 'Slovakia', 'SKK'),
  new CountryCode('SI', 'Slovenia', 'EUR'),
  new CountryCode('SB', 'Solomon Islands', 'AUD'),
  new CountryCode('SO', 'Somalia', 'SOS'),
  new CountryCode('X9', 'Somaliland', null),
  new CountryCode('ZA', 'South Africa', 'ZAR'),
  new CountryCode('ES', 'Spain', 'EUR'),
  new CountryCode('LK', 'Sri Lanka', 'LKR'),
  new CountryCode('BL', 'St. Barthelemy', 'EUR'),
  new CountryCode('1L', 'St. Croix', 'USD'),
  new CountryCode('XB', 'St. Eustatius', null),
  new CountryCode('1J', 'St. John', 'USD'),
  new CountryCode('KN', 'St. Kitts', 'XCD'),
  new CountryCode('LC', 'St. Lucia', null),
  new CountryCode('MF', 'St. Maarten', 'ANG'),
  new CountryCode('1K', 'St. Thomas', 'USD'),
  new CountryCode('VC', 'St. Vincent', 'XCD'),
  new CountryCode('SR', 'Suriname', 'USD'),
  new CountryCode('SZ', 'Swaziland', 'ZAR'),
  new CountryCode('SE', 'Sweden', 'SEK'),
  new CountryCode('CH', 'Switzerland', 'CHF'),
  new CountryCode('SY', 'Syria', 'SYP'),
  new CountryCode('XG', 'Tahiti', null),
  new CountryCode('TW', 'Taiwan', 'TWD'),
  new CountryCode('TJ', 'Tajikistan', 'TJS'),
  new CountryCode('TZ', 'Tanzania', 'TZS'),
  new CountryCode('TH', 'Thailand', 'THB'),
  new CountryCode('TG', 'Togo', 'XAF'),
  new CountryCode('TO', 'Tonga', 'TOP'),
  new CountryCode('TT', 'Trinidad and Tobago', 'TTD'),
  new CountryCode('TN', 'Tunisia', 'TND'),
  new CountryCode('TR', 'Turkey', 'TRY'),
  new CountryCode('TM', 'Turkmenistan', 'TMM'),
  new CountryCode('TC', 'Turks and Caicos Islands', 'USD'),
  new CountryCode('TV', 'Tuvalu', 'AUD'),
  new CountryCode('UG', 'Uganda', 'UGX'),
  new CountryCode('UA', 'Ukraine', 'EUR'),
  new CountryCode('AE', 'United Arab Emirates', 'AED'),
  new CountryCode('GB', 'United Kingdom', 'GBP'),
  new CountryCode('US', 'United States', 'USD'),
  new CountryCode('AK', 'United States - Alaska', 'USD'),
  new CountryCode('HI', 'United States - Hawaii', 'USD'),
  new CountryCode('UY', 'Uruguay', 'UYU'),
  new CountryCode('UZ', 'Uzbekistan', 'UZS'),
  new CountryCode('VU', 'Vanuatu', 'VUV'),
  new CountryCode('VE', 'Venezuela', 'VEF'),
  new CountryCode('VN', 'Vietnam', 'VND'),
  new CountryCode('VG', 'Virgin Islands (BR)', 'USD'),
  new CountryCode('VI', 'Virgin Islands (US)', 'USD'),
  new CountryCode('1B', 'Wales (U.K.) ', null),
  new CountryCode('WF', 'Wallis and Futuna ', 'CFP'),
  new CountryCode('WS', 'Western Samoa', 'WST'),
  new CountryCode('YE', 'Yemen', 'YER'),
  new CountryCode('YU', 'Yugoslavia', 'YUN'),
  new CountryCode('ZM', 'Zambia', 'ZMK'),
  new CountryCode('ZW', 'Zimbabwe', 'ZWD')
]

const languageArray = [
  'en',
  'es'
]

const carriers = {
  UPS: 1,
  FedEx: 2,
  DHL: 3,
  USPS: 4,
  EMS: 5,
  Other: 6
}

/*****
* Non-Exported constants
*****/

const propertyTypeMap = {
  'boolean': 'boolean',
  string: 'string',
  'int': 'int',
  'float': 'float',
  object: 'object',
  array: 'array',
  nonEmptyArray: 'array',
  validLanguage: 'string',
  stringYOrN: 'string',
  string10: 'string',
  string100: 'string',
  string15: 'string',
  string250: 'string',
  string50: 'string',
  float4: 'float',
  intBool: 'int',
  validCurrency: 'string',
  intRange0to3: 'int',
  validCountry: 'string',
  hubCountry: 'string',
  carrierCode: 'int',
  csvStringCountry: 'string'
}

/*****
* Exported helper functions
*****/

function isValidCurrency (currencyCode) {
  let i = 0
  var isValid = false
  while (i < countryCodeArray.length && !isValid) {
    if (currencyCode === countryCodeArray[i].currency) {
      isValid = true
    }
    i++
  }
  return isValid
}

function isValidCountry (countryCode) {
  let i = 0
  var isValid = false
  while (i < countryCodeArray.length && !isValid) {
    if (countryCode === countryCodeArray[i].code) {
      isValid = true
    }
    i++
  }
  return isValid
}

function getHubCountry (facilityCode) {
  let i = 0
  var countryCode = false
  while (i < exportHubArray.length && !countryCode) {
    if (facilityCode === exportHubArray[i].facility) {
      countryCode = exportHubArray[i].country
    }
    i++
  }

  return countryCode
}

function getCarrierCode (carrierString) {
  if (typeof carrierString === 'string' && carriers.hasOwnProperty(carrierString)) {
    return carriers[carrierString]
  } else {
    return 6
  }
}

function isValidLanguage (languageCode) {
  var isValid = false
  if (languageArray.indexOf(languageCode.substring(0, 2).toLowerCase()) !== -1) {
    isValid = true
  }
  return isValid
}

/*****
* Non-exported helper functions
*****/

// Given a class (only really used with constructors), returns an array of argument names for constructor.
function getConstructorArgNames (constructorFunc) {
  if (typeof constructorFunc !== 'function') {
    return []
  } else {
    let funcString = constructorFunc.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg, '')
    let constructorStart = funcString.indexOf('(') + 1
    let constructorEnd = funcString.indexOf(')', constructorStart)
    funcString = funcString.substring(constructorStart, constructorEnd)
    funcString = funcString.split(/,/)
    return funcString
  }
}

// Given an xml node object, returns value stripped of parser garbage. If not an object, returns argument.
function xmlNodeValue (nodeObject) {
  if (typeof nodeObject !== 'object' || undefined === typeof nodeObject._) {
    return nodeObject
  } else {
    return nodeObject._
  }
}

// Iterates over a parsed xml array of objects node and returns a JS array of those objects, optionally using a supplied object constructor for each (constructor argument names must match XML property names)
function xmlObjectNodeArray (nodeObject, ObjectConstructor) {
  var returnArray = []
  if (!Array.isArray(nodeObject)) {
    return nodeObject
  } else if (typeof ObjectConstructor === 'function') {
    var argNameArray = getConstructorArgNames(ObjectConstructor)
    for (let i = 0; i < nodeObject.length; i++) {
      let argsArray = []
      for (let j = 0; j < argNameArray.length; j++) {
        argsArray.push(xmlNodeValue(nodeObject[i][argNameArray[j]]))
      }

      returnArray[i] = new ObjectConstructor(...argsArray)
    }
    return returnArray
  } else {
    for (let i = 0; i < nodeObject.length; i++) {
      returnArray[i] = {}
      if (nodeObject[i].hasOwnProperty('xsi:type')) {
        delete nodeObject[i]['xsi:type']
      }
      for (let itemProp in nodeObject[i]) {
        if (nodeObject[i].hasOwnProperty(itemProp)) {
          returnArray[i][itemProp] = xmlNodeValue(nodeObject[i][itemProp])
        }
      }
    }
    return returnArray
  }
}

// Given a source object, target object, property name, and test value,
// Function sets target property with value of source property if it passes test.
// Optional default value subs default if property is not set.
// Returns false if property not set or value of set property.
function setPropertyIf (sourceObj, targetObj, propName, testVal = 'exists', defaultVal = null) {
  if (typeof sourceObj !== 'object' || typeof targetObj !== 'object' || typeof propName !== 'string') {
    throw new TypeError('invalid objects or property name passed to setPropertyIf')
  }

  let useDefault = (typeof defaultVal !== 'undefined' && defaultVal !== null)
  let testMap = {

    exists: function testExists (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] !== 'undefined') {
        targetObj[propName] = sourceObj[propName]
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal
        return targetObj[propName]
      } else {
        return false
      }
    },
    boolean: function testBoolean (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'boolean') {
        targetObj[propName] = sourceObj[propName]
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = !!((defaultVal && defaultVal !== 'false' && defaultVal !== 0 && defaultVal !== '0'))
        return targetObj[propName]
      } else {
        return false
      }
    },
    string: function testString (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'string') {
        targetObj[propName] = sourceObj[propName]
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal
        return targetObj[propName]
      } else {
        return false
      }
    },
    csvStringCountry: function testString (sourceObj, targetObj, propName, defaultVal, useDefault) {
      var validCountries = []
      if (typeof sourceObj[propName] === 'string') {
        if (sourceObj[propName].indexOf(',') === -1) {
          // Will return false if not a valid country string
          return isValidCountry(targetObj[propName].trim().substring(0, 2).toUpperCase())
        } else {
          var countriesArray = sourceObj[propName].split(',')
          for (let i = 0; i < countriesArray.length; i++) {
            let currentCountry = countriesArray[i].trim().substring(0, 2).toUpperCase()
            if (isValidCountry(currentCountry)) {
              validCountries.push(currentCountry)
            }
          }
          return validCountries.toString()
        }
      } else if (Array.isArray(sourceObj[propName])) {
        for (let i = 0; i < sourceObj[propName].length; i++) {
          let currentCountry = sourceObj[propName][i].trim().substring(0, 2).toUpperCase()
          if (isValidCountry(currentCountry)) {
            validCountries.push(currentCountry)
          }
        }
        return validCountries.toString()
      } else if (useDefault) {
        targetObj[propName] = defaultVal.substring(0, 10)
        return targetObj[propName]
      } else {
        return false
      }
    },
    string10: function testString10 (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'string') {
        targetObj[propName] = sourceObj[propName].substring(0, 10)
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal.substring(0, 10)
        return targetObj[propName]
      } else {
        return false
      }
    },
    string100: function testString100 (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'string') {
        targetObj[propName] = sourceObj[propName].substring(0, 100)
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal.substring(0, 100)
        return targetObj[propName]
      } else {
        return false
      }
    },
    string15: function testString15 (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'string') {
        targetObj[propName] = sourceObj[propName].substring(0, 15)
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal.substring(0, 15)
        return targetObj[propName]
      } else {
        return false
      }
    },
    string50: function testString50 (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'string') {
        targetObj[propName] = sourceObj[propName].substring(0, 50)
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal.substring(0, 50)
        return targetObj[propName]
      } else {
        return false
      }
    },
    string250: function testString250 (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'string') {
        targetObj[propName] = sourceObj[propName].substring(0, 250)
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal.substring(0, 250)
        return targetObj[propName]
      } else {
        return false
      }
    },
    'int': function testInt (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'number' && !(isNaN(parseInt(sourceObj[propName])))) {
        targetObj[propName] = parseInt(sourceObj[propName])
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = parseInt(defaultVal)
        return targetObj[propName]
      } else {
        return false
      }
    },
    intBool: function testInt (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'number' && !(isNaN(parseInt(sourceObj[propName]))) && (parseInt(sourceObj[propName]) === 0 || parseInt(sourceObj[propName]) === 1)) {
        targetObj[propName] = parseInt(sourceObj[propName])
        return targetObj[propName]
      } else if (useDefault && (parseInt(defaultVal) === 0 || parseInt(defaultVal) === 1)) {
        targetObj[propName] = parseInt(defaultVal)
        return targetObj[propName]
      } else {
        return false
      }
    },
    intRange0to3: function testIntRange0to3 (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'number' && !(isNaN(parseInt(sourceObj[propName]))) && parseInt(sourceObj[propName]) > -1 && parseInt(sourceObj[propName]) < 4) {
        targetObj[propName] = parseInt(sourceObj[propName])
        return targetObj[propName]
      } else if (useDefault && parseInt(sourceObj[propName]) > -1 && parseInt(sourceObj[propName]) < 4) {
        targetObj[propName] = parseInt(defaultVal)
        return targetObj[propName]
      } else {
        return false
      }
    },
    'float': function testFloat (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'number' && !(isNaN(parseFloat(sourceObj[propName])))) {
        targetObj[propName] = parseFloat(sourceObj[propName])
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = parseFloat(defaultVal)
        return targetObj[propName]
      } else {
        return false
      }
    },
    float4: function testFloat4 (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'number' && !(isNaN(parseFloat(sourceObj[propName])))) {
        targetObj[propName] = parseFloat(sourceObj[propName]).toFixed(4)
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = parseFloat(defaultVal).toFixed(4)
        return targetObj[propName]
      } else {
        return false
      }
    },
    'object': function testObject (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'object') {
        targetObj[propName] = sourceObj[propName]
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal
        return targetObj[propName]
      } else {
        return false
      }
    },
    'array': function testArray (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'object' && Array.isArray(sourceObj[propName])) {
        targetObj[propName] = sourceObj[propName]
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal
        return targetObj[propName]
      } else {
        return false
      }
    },
    nonEmptyArray: function testNonEmptyArray (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'object' && Array.isArray(sourceObj[propName]) && sourceObj[propName].length > 0) {
        targetObj[propName] = sourceObj[propName]
        return targetObj[propName]
      } else if (useDefault && typeof defaultVal === 'object' && Array.isArray(defaultVal) && defaultVal.length > 0) {
        targetObj[propName] = defaultVal
        return targetObj[propName]
      } else {
        return false
      }
    },
    validLanguage: function testValidLanguage (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'string' && isValidLanguage(sourceObj[propName].trim().toLowerCase().substring(0, 2))) {
        targetObj[propName] = sourceObj[propName].trim().toLowerCase().substring(0, 2)
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal.trim().toLowerCase().substring(0, 2)
        return targetObj[propName]
      } else {
        return false
      }
    },
    validCurrency: function testValidCurrency (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'string' && isValidCurrency(sourceObj[propName].trim().toUpperCase().substring(0, 3))) {
        targetObj[propName] = sourceObj[propName].trim().toUpperCase().substring(0, 3)
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal.trim().toUpperCase().substring(0, 3)
        return targetObj[propName]
      } else {
        return false
      }
    },
    validCountry: function testValidCountry (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'string' && isValidCountry(sourceObj[propName].trim().toUpperCase().substring(0, 2))) {
        targetObj[propName] = sourceObj[propName].trim().toUpperCase().substring(0, 2)
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal.trim().toUpperCase().substring(0, 2)
        return targetObj[propName]
      } else {
        return false
      }
    },
    carrierCode: function testCarrierCode (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'string') {
        targetObj[propName] = getCarrierCode(sourceObj[propName].trim())
        return targetObj[propName]
      } else if (typeof sourceObj[propName] === 'number' && !(isNaN(parseInt(sourceObj[propName]))) && parseInt(sourceObj[propName]) > -1 && parseInt(sourceObj[propName]) < 4) {
        targetObj[propName] = parseInt(sourceObj[propName])
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal.trim().toLowerCase().substring(0, 2)
        return targetObj[propName]
      } else {
        return false
      }
    },
    stringYOrN: function stringYOrN (sourceObj, targetObj, propName, defaultVal, useDefault) {
      if (typeof sourceObj[propName] === 'string' && (sourceObj[propName].trim().toUpperCase().substring(0, 1) === 'Y' || sourceObj[propName].trim().toUpperCase().substring(0, 1) === 'N')) {
        targetObj[propName] = sourceObj[propName].trim().toUpperCase().substring(0, 1)
        return targetObj[propName]
      } else if (useDefault) {
        targetObj[propName] = defaultVal.trim().toUpperCase().substring(0, 1)
        return targetObj[propName]
      } else {
        return false
      }
    }

  }
  if (testMap.hasOwnProperty(testVal)) {
    return testMap[testVal](sourceObj, targetObj, propName, defaultVal, useDefault)
  } else {
    return testMap.exists(sourceObj, targetObj, propName, defaultVal, useDefault)
  }
}

/*****
* Exports (including callback & promise based client classes)
*****/

module.exports = {

  client: class FedExCBClientCallback {
    constructor (args) {
      this.wsdlUri = fecbUri + '?wsdl'
      this.serviceUri = fecbUri
      if (typeof args.language !== 'string' || args.language.trim().length !== 2) {
        throw new TypeError('FECB client constructor requires args.language to be a two character string')
      } else {
        setPropertyIf(args, this, 'language', 'validLanguage', 'en')
      }
      if (typeof args.merchantKey !== 'string' || args.merchantKey.trim().length >= 65) {
        throw new TypeError('FECB client constructor requires args.merchantKey to be a string of 64 characters or fewer')
      } else {
        this.merchantKey = args.merchantKey.trim().substring(0, 64)
      }
      this.returnRaw = !!((typeof args.returnRaw !== 'undefined' && args.returnRaw))
      this.returnSoapHeader = !!((typeof args.returnSoapHeader !== 'undefined' && args.returnSoapHeader))
      this.stripWrapper = !((typeof args.stripWrapper !== 'undefined' || !args.stripWrapper))
      this.returnFullResponse = !((typeof args.returnFullResponse !== 'undefined' || !args.returnFullResponse))
      this.performRequestCallbacks = {}
    }

    performRequest (action, body, callback) {
      if (typeof callback !== 'function' || callback.length !== 3) {
        throw new TypeError('FECB client.performRequest was passed an invalid callback')
      } else {
        this.performRequestCallbacks[action] = callback
        this.performRequestAction = action
        this.performRequestXml = '<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v4="' + this.serviceUri + '" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"><soapenv:Header/><soapenv:Body><v4:' + action + ' soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><request xsi:type="v4:' + action + 'Request">' + body + '</request></v4:' + action + '></soapenv:Body></soapenv:Envelope>'

        var parser = new xml2js.Parser({explicitArray: false, trim: true, mergeAttrs: true})
        parser.parseString(this.performRequestXml, function (error, xmlObj) {
          if (error) {
            return callback(error, null, null)
          } else {
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
                SOAPAction: 'https://api.crossborder.fedex.com/services/v4.4#' + action
              }
            }
            request(requestOptions, function (error, response, body) {
              if (error) {
                return this.performRequestCallbacks[this.performRequestAction](error, null, null)
              } else {
                parser.parseString(body, function (error, parsedBody) {
                  if (error) {
                    return this.performRequestCallbacks[this.performRequestAction](false, response, body)
                  } else {
                    return this.performRequestCallbacks[this.performRequestAction](false, response, parsedBody)
                  }
                }.bind(this))
              }
            }.bind(this))
          }
        }.bind(this))
      }
    }

    productInfo (itemsArray, callback) {
      if (typeof callback !== 'function' || callback.length !== 2) {
        throw new TypeError('FECB client.productInfo was passed an invalid callback')
      } else {
        this.productInfoCallback = callback
        this.productInfoItems = []
        var xmlItems = ''
        if (typeof itemsArray === 'object' && Array.isArray(itemsArray) && itemsArray.length > 0) {
          for (let i = 0; i < itemsArray.length; i++) {
            var optionalArgs = (typeof itemsArray[i].optionalArgs === 'object' && itemsArray[i].optionalArgs !== null) ? itemsArray[i].optionalArgs : null
            var itemInformation = (typeof itemsArray[i].itemInformation === 'object' && itemsArray[i].itemInformation !== null) ? new CartonsDat(itemsArray[i].itemInformation.l, itemsArray[i].itemInformation.w, itemsArray[i].itemInformation.h, itemsArray[i].itemInformation.wt) : new CartonsDat(null, null, null, null)
            var productInfoObj = new ProductInfoDat(itemsArray[i].id, itemsArray[i].description, itemsArray[i].price, itemsArray[i].currency, itemsArray[i].exportHub, itemsArray[i].origin, itemInformation, optionalArgs)
            this.productInfoItems.push(productInfoObj)
            xmlItems += productInfoObj.getXmlString()
          }
          this.productInfoRequest = {
            items: this.productInfoItems,
            language: this.language,
            partnerKey: this.merchantKey
          }
          this.productInfoRequestXML = '<partnerKey xsi:type="xsd:string">' + this.productInfoRequest.partnerKey + '</partnerKey>'
          this.productInfoRequestXML += '<language xsi:type="xsd:string">' + this.productInfoRequest.language + '</language>'
          this.productInfoRequestXML += '<items xsi:type="v4:ArrayOfProductInfoDat" soapenc:arrayType="v4:ProductInfoDat[]">' + xmlItems + '</items>'
          this.performRequest('ConnectProductInfo', this.productInfoRequestXML, function (error, response, body) {
            if (error) {
              return this.productInfoCallback(error, null)
            } else {
              var justTheBody = body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectProductInfoResponse'].return
              delete justTheBody['xsi:type']
              var bodyError = (typeof justTheBody.error !== 'undefined') ? xmlNodeValue(justTheBody.error) : 0
              if (bodyError !== 0) {
                var eMessage = 'Code ' + parseInt(bodyError)
                if (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') {
                  eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage)
                }
                error = new Error(eMessage)
                return this.productInfoCallback(error, null)
              } else {
                var bodyObj = {
                  error: parseInt(bodyError),
                  errorMessage: (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') ? xmlNodeValue(justTheBody.errorMessage) : '',
                  errorMessageDetail: (typeof xmlNodeValue(justTheBody.errorMessageDetail) === 'string') ? xmlNodeValue(justTheBody.errorMessageDetail) : ''
                }
                if (this.stripWrapper) {
                  return this.productInfoCallback(false, bodyObj)
                } else {
                  var productInfoResult = {
                    body: bodyObj,
                    statusCode: response.statusCode,
                    request: this.productInfoRequest
                  }
                  if (this.returnRaw) {
                    productInfoResult.raw = response.body
                  }
                  if (this.returnSoapHeader) {
                    let soapHeader = body['SOAP-ENV:Envelope']
                    delete soapHeader['SOAP-ENV:Body']
                    productInfoResult.soapHeader = JSON.stringify(soapHeader)
                  }
                  if (this.returnFullResponse) {
                    productInfoResult.response = response
                  }
                  return this.productInfoCallback(false, productInfoResult)
                }
              }
            }
          }.bind(this))
        } else {
          throw new TypeError('FECB client.productInfo was passed an invalid array of items')
        }
      }
    }

    /*****
      callback = function w/ two arguments: (error, result)

      lcRequest = {
        items: [
          {
            productID: 'string',
            quantity: 'int',
            price: 'float(13,4)',
            itemExportHubCountry: 'string(2)'
          }
        ],
        shipmentDestinationCountry: 'string(2)',
        optionalArgs: {
          privateIndividuals: 'string(1); "Y" or "N"',
          shipmentDestinationAddress1: 'string(250)',
          shipmentDestinationAddress2: 'string(250)',
          shipmentDestinationCity: 'string(50)',
          shipmentDestinationStateOrProvince: 'string(50)',
          shipmentDestinationZip: 'string(50)',
          domesticShippingCost: 'float(13,4)',
          insuranceFlag: 'int(1); 0 or 1',
          orderValuationCurrency: 'string(3)',
          requestedCostReturnedCurrency: 'string(3)',
          service: 'int(1); 0 (express), 1 (standard), or 2 (economy)'
        }
      }
    *****/
    landedCost (lcRequest, callback) {
      if (typeof callback !== 'function' || callback.length !== 2) {
        throw new TypeError('FECB client.landedCost was passed an invalid callback')
      } else {
        this.landedCostCallback = callback
        if (typeof lcRequest === 'undefined' || typeof lcRequest.items !== 'object' || !(Array.isArray(lcRequest.items)) || typeof lcRequest.shipmentDestinationCountry !== 'string') {
          throw new TypeError('FECB client.landedCost was passed an invalid request object')
        } else {
          let sdc = lcRequest.shipmentDestinationCountry.trim().toUpperCase().substring(0, 3)
          this.landedCostRequest = {
            language: this.language,
            partnerKey: this.merchantKey,
            shipmentDestinationCountry: isValidCountry(sdc) ? sdc : 'US'
          }
          this.landedCostRequestXml = '<partnerKey xsi:type="xsd:string">' + this.landedCostRequest.partnerKey + '</partnerKey>'
          this.landedCostRequestXml += '<language xsi:type="xsd:string">' + this.landedCostRequest.language + '</language>'
          this.landedCostRequestXml += '<shipmentDestinationCountry xsi:type="xsd:string">' + this.landedCostRequest.shipmentDestinationCountry + '</shipmentDestinationCountry>'
          this.landedCostRequestXml += '<items xsi:type="v4:ArrayOfProductInfo" soapenc:arrayType="v4:ProductInfo[]">'
          let landedCostItems = []
          for (let i = 0; i < lcRequest.items.length; i++) {
            landedCostItems[i] = new ProductInfo(lcRequest.items[i].id, lcRequest.items[i].quantity, lcRequest.items[i].price, lcRequest.items[i].exportHub)
            this.landedCostRequestXml += landedCostItems[i].getXmlString()
          }
          this.landedCostRequestXml += '</items>'
          this.landedCostRequest.items = landedCostItems
          if (typeof lcRequest.optionalArgs === 'object') {
            let lcRequestOptionalArgs = {
              privateIndividuals: 'stringYOrN',
              shipmentDestinationAddress1: 'string250',
              shipmentDestinationAddress2: 'string250',
              shipmentDestinationCity: 'string50',
              shipmentDestinationStateOrProvince: 'string50',
              shipmentDestinationZip: 'string50',
              domesticShippingCost: 'float4',
              insuranceFlag: 'intBool',
              orderValuationCurrency: 'validCurrency',
              requestedCostReturnedCurrency: 'validCurrency',
              service: 'intRange0to3'
            }

            for (let optArgName in lcRequestOptionalArgs) {
              let setPropVal = setPropertyIf(lcRequest.optionalArgs, this.landedCostRequest, optArgName, lcRequestOptionalArgs[optArgName])
              this.landedCostRequestXml += setPropVal ? '<' + optArgName + ' xsi:type="' + propertyTypeMap[lcRequestOptionalArgs[optArgName]] + '">' + setPropVal + '</' + optArgName + '>' : ''
            }
          }
        }
        this.performRequest('ConnectLandedCost', this.landedCostRequestXml,
        function (error, response, body) {
          if (error) {
            return this.landedCostCallback(error, null)
          } else {
            var justTheBody = body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectLandedCostResponse'].return
            delete justTheBody['xsi:type']
            var bodyError = (typeof justTheBody.error !== 'undefined') ? xmlNodeValue(justTheBody.error) : 0
            if (bodyError !== 0) {
              var eMessage = 'Code ' + parseInt(bodyError)
              if (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') {
                eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage)
              }
              error = new Error(eMessage)
              return this.landedCostCallback(error, null)
            } else {
              var bodyObj = {
                error: parseInt(bodyError),
                errorMessage: (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') ? xmlNodeValue(justTheBody.errorMessage) : '',
                errorMessageDetail: (typeof xmlNodeValue(justTheBody.errorMessageDetail) === 'string') ? xmlNodeValue(justTheBody.errorMessageDetail) : ''
              }
              let lcResponseArgs = {
                dutyCost: 'float4',
                taxCost: 'float4',
                shippingCost: 'float4',
                insuranceCost: 'float4',
                ddpAvailable: 'intBool',
                landedCostTransactionId: 'string',
                orderValuationCurrencyCode: 'validCurrency',
                orderValuationCurrencyExchangeRate: 'string',
                requestedCostReturnedCurrencyCode: 'validCurrency',
                requestedCostReturnedCurrencyExchangeRate: 'string',
                service: 'intRange0to3'
              }
              for (let argName in lcResponseArgs) {
                let setPropVal = setPropertyIf(justTheBody, bodyObj, argName, lcResponseArgs[argName])
              }
              if (typeof justTheBody.items === 'object' && Array.isArray(justTheBody.items.item)) {
                bodyObj.items = xmlObjectNodeArray(justTheBody.items.item, LandedProduct)
              }
              if (this.stripWrapper) {
                return this.landedCostCallback(false, bodyObj)
              } else {
                var landedCostResult = {
                  body: bodyObj,
                  statusCode: response.statusCode,
                  request: this.landedCostRequest
                }
                if (this.returnRaw) {
                  landedCostResult.raw = response.body
                }
                if (this.returnSoapHeader) {
                  let soapHeader = body['SOAP-ENV:Envelope']
                  delete soapHeader['SOAP-ENV:Body']
                  landedCostResult.soapHeader = JSON.stringify(soapHeader)
                }
                if (this.returnFullResponse) {
                  landedCostResult.response = response
                }
                return this.landedCostCallback(false, landedCostResult)
              }
            }
          }
        }.bind(this))
      }
    }

    /*****
    callback = function w/ two arguments: (error, result)

    oRequest = {
      orderNumber: 'string(100)',
      landedCostTransactionID
      shipToFirstName: 'string(100)',
      shipToLastName: 'string(100)',
      shipToAddress1: 'string',
      shipToCity: 'string(100)',
      shipToCountry: 'string(2)'
      ordersInfo: [
        {
          id: 'string',
          quantity: 'int',
          price: 'float(13,4)',
          currency: 'string(3),
          optionalArgs: {
            exportHub: 'string(3)',
            carrier: 'int(1)',
            trackingNumber: 'string(100)
          }
        }
      ],
      optionalArgs: {
        shipToBusiness: 'string(250)',
        shipToAddress2: 'string(250)',
        shipToAddress3: 'string(250)',
        shipToState: 'string(50)',
        shipToZip: 'string(50)',
        shipToPhone: 'string(50)',
        shipToEmail: 'string',
        shipToTaxID: 'string',
        repackage: 'int(1); 0 (don't repackage), or 1 (repackage)',
        dutyPaid: 'int(1); 0 (doesn't pay), or 1 (does pay)',
        insurance: 'int(1); 0 (not insured), or 1 (insured)',
        emailCustomerTracking: 'int(1); 0 (don't send link to customer), or 1 (send tracking link to customer)',
        bongoCustomerService: 'int(1); 0 (don't show customer FECB support link/chat), or 1 (show customer FECB support link/chat)',
        sellingStoreName: 'string(100)',
        sellingStoreURL: 'string(250)',
        sellingStoreURLCS: 'string(250)',
        sellingStoreURLImage: 'string(250)'
      }
    }
    *****/
    order (oRequest, callback) {
      if (typeof callback !== 'function' || callback.length !== 2) {
        throw new TypeError('FECB client.order was passed an invalid callback')
      } else {
        this.orderCallback = callback
        if (typeof oRequest !== 'object' || typeof oRequest.orderNumber !== 'string' || typeof oRequest.landedCostTransactionID !== 'string' || typeof oRequest.shipToFirstName !== 'string' || typeof oRequest.shipToLastName !== 'string' || typeof oRequest.shipToAddress1 !== 'string' || typeof oRequest.shipToCity !== 'string' || typeof oRequest.shipToCountry !== 'string' || typeof oRequest.ordersInfo !== 'object' || Array.isArray(oRequest.ordersInfo) || oRequest.ordersInfo.length < 1) {
          throw new TypeError('FECB client.order was passed an invalid request object')
        } else {
          let stc = oRequest.shipToCountry.trim().toUpperCase().substring(0, 3)
          let stfn = oRequest.shipToFirstName.trim().toUpperCase().substring(0, 100)
          this.orderRequest = {
            language: this.language,
            partnerKey: this.merchantKey,
            orderNumber: oRequest.orderNumber.trim().toUpperCase().substring(0, 100),
            shipToFirstName: oRequest.shipToFirstName.trim().toUpperCase().substring(0, 100),
            shipToLastName: oRequest.shipToLastName.trim().toUpperCase().substring(0, 100),
            shipToAddress1: oRequest.shipToAddress1.trim().toUpperCase().substring(0, 255),
            shipToCity: oRequest.shipToCity.trim().toUpperCase().substring(0, 100),
            shipToCountry: isValidCountry(stc) ? stc : 'US'
          }
          this.ordersInfo = []
          var xmlOrdersInfo = ''
          for (let i = 0; i < oRequest.ordersInfo.length: i++) {
            let optionalArgs = (typeof oRequest.ordersInfo[i].optionalArgs === 'object' && oRequest.ordersInfo[i].optionalArgs !== null) ? oRequest.ordersInfo[i].optionalArgs : null
            let orderInformationObj = new OrderInformation(
              oRequest.ordersInfo[i].id,
              oRequest.ordersInfo[i].quantity,
              oRequest.ordersInfo[i].price,
              oRequest.ordersInfo[i].currency,
              optionalArgs
            )
            this.ordersInfo.push(orderInformationObj)
            xmlOrdersInfo += orderInformationObj.getXmlString()
          }
          this.orderRequestXML = '<partnerKey xsi:type="xsd:string">' + this.orderRequest.partnerKey + '</partnerKey>'
          this.orderRequestXML += '<language xsi:type="xsd:string">' + this.orderRequest.language + '</language>'
          this.orderRequestXML += '<orderNumber xsi:type="xsd:string">' + this.orderRequest.orderNumber + '</orderNumber>'
          this.orderRequestXML += '<landedCostTransactionID xsi:type="xsd:string">' + this.orderRequest.landedCostTransactionID + '</landedCostTransactionID>'
          this.orderRequestXML += '<ordersInfo xsi:type="v4:ArrayOfOrderInformation" soapenc:arrayType="v4:OrderInformation[]">' + xmlOrdersInfo + '</ordersInfo>'
          this.orderRequestXML += '<shipToFirstName xsi:type="xsd:string">' + this.orderRequest.shipToFirstName + '</shipToFirstName>'
          this.orderRequestXML += '<shipToLastName xsi:type="xsd:string">' + this.orderRequest.shipToLastName + '</shipToLastName>'
          this.orderRequestXML += '<shipToAddress1 xsi:type="xsd:string">' + this.orderRequest.shipToAddress1 + '</shipToAddress1>'
          this.orderRequestXML += '<shipToCity xsi:type="xsd:string">' + this.orderRequest.shipToCity + '</shipToCity>'
          this.orderRequestXML += '<shipToCountry xsi:type="xsd:string">' + this.orderRequest.shipToCountry + '</shipToCountry>'
          if (typeof oRequest.optionalArgs === 'object') {
            let oRequestOptionalArgs = {
              shipToBusiness: 'string250',
              shipToAddress2: 'string250',
              shipToAddress3: 'string250',
              shipToState: 'string50',
              shipToZip: 'string50',
              shipToPhone: 'string50',
              shipToEmail: 'string',
              shipToTaxID: 'string',
              repackage: 'intBool',
              dutyPaid: 'intBool',
              insurance: 'intBool',
              emailCustomerTracking: 'intBool',
              bongoCustomerService: 'intBool',
              sellingStoreName: 'string100',
              sellingStoreURL: 'string250',
              sellingStoreURLCS: 'string250',
              sellingStoreURLImage: 'string250'
            }
            for (let optArgName in oRequestOptionalArgs) {
              let setPropVal = setPropertyIf(oRequest.optionalArgs, this.orderRequest, optArgName, oRequestOptionalArgs[optArgName])
              this.orderRequestXML += setPropVal ? '<' + optArgName + ' xsi:type="' + propertyTypeMap[oRequestOptionalArgs[optArgName]] + '">' + setPropVal + '</' + optArgName + '>' : ''
            }
          }
          this.performRequest('ConnectOrder', this.orderRequestXML, function(error, response, body) {
            if (error) {
              return this.orderCallback(error, null)
            } else {
              var justTheBody = body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectOrderResponse'].return
              delete justTheBody['xsi:type']
              var bodyError = (typeof justTheBody.error !== 'undefined') ? xmlNodeValue(justTheBody.error) : 0
              if (bodyError !== 0) {
                var eMessage = 'Code ' + parseInt(bodyError)
                if (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') {
                  eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage)
                }
                error = new Error(eMessage)
                return this.orderCallback(error, null)
              } else {
                var bodyObj = {
                  error: parseInt(bodyError),
                  errorMessage: (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') ? xmlNodeValue(justTheBody.errorMessage) : '',
                  errorMessageDetail: (typeof xmlNodeValue(justTheBody.errorMessageDetail) === 'string') ? xmlNodeValue(justTheBody.errorMessageDetail) : ''
                }
                let oResponseArgs = {
                  trackingLink: 'string'
                }
                for (let argName in oResponseArgs) {
                  let setPropVal = setPropertyIf(justTheBody, bodyObj, argName, oResponseArgs[argName])
                }
                if (this.stripWrapper) {
                  return this.orderCallback(false, bodyObj)
                } else {
                  var orderResult = {
                    body: bodyObj,
                    statusCode: response.statusCode,
                    request: this.orderRequest
                  }
                  if (this.returnRaw) {
                    orderResult.raw = response.body
                  }
                  if (this.returnSoapHeader) {
                    let soapHeader = body['SOAP-ENV:Envelope']
                    delete soapHeader['SOAP-ENV:Body']
                    orderResult.soapHeader = JSON.stringify(soapHeader)
                  }
                  if (this.returnFullResponse) {
                    orderResult.response = response
                  }
                  return this.orderCallback(false, orderResult)
            }
          }
        }
      }.bind(this))
    }
      }
    }

    /*****
    callback = function w/ two arguments: (error, result)

    otuRequest = {
      orderNumber: 'string(100)',
      trackList: [
        {
          productID: 'string',
          trackingNumber: 'string(100)',
          quantity: 'int',
          carrier: 'int(1)'
        }
      ]
    }
    *****/
    orderTrackingUpdate (otuRequest, callback) {
      if (typeof callback !== 'function' || callback.length !== 2) {
        throw new TypeError('FECB client.orderTrackingUpdate was passed an invalid callback')
      } else {
        this.orderTrackingUpdateCallback = callback
        if (typeof otuRequest === 'undefined' || typeof otuRequest.trackList !== 'object' || !(Array.isArray(otuRequest.trackList)) || typeof otuRequest.orderNumber !== 'string') {
          throw new TypeError('FECB client.orderTrackingUpdate was passed an invalid request object')
        }
        else {
          this.orderTrackingUpdateRequest = {
            language: this.language,
            partnerKey: this.merchantKey,
            orderNumber: otuRequest.trim().substring(0, 100)
          }
          this.orderTrackingUpdateRequestXml = '<partnerKey xsi:type="xsd:string">' + this.orderTrackingUpdateRequest.partnerKey + '</partnerKey>'
          this.orderTrackingUpdateRequestXml += '<language xsi:type="xsd:string">' + this.orderTrackingUpdateRequest.language + '</language>'
          this.orderTrackingUpdateRequestXml += '<orderNumber xsi:type="xsd:string">' + this.orderTrackingUpdateRequest.orderNumber + '</orderNumber>'
          this.orderTrackingUpdateRequestXml += '<trackList xsi:type="v4:ArrayOfTrackingList" soapenc:arrayType="v4:TrackingList[]">'
          let orderTrackingUpdateRequestTrackList = []
          for (let i = 0; i < otuRequest.trackList.length; i++) {
            orderTrackingUpdateRequestTrackList[i] = new TrackingList(otuRequest.trackList[i].productID, otuRequest.trackList[i].trackingNumber, otuRequest.trackList[i].quantity, otuRequest.trackList[i].carrier)
            this.orderTrackingUpdateRequestXml += orderTrackingUpdateRequestTrackList[i].getXmlString()
          }
          this.orderTrackingUpdateRequestXml += '</trackList>'
          this.orderTrackingUpdateRequest.trackList = orderTrackingUpdateRequestTrackList

        this.performRequest('ConnectOrderTrackingUpdate', this.orderTrackingUpdateRequestXml, function (error, response, body) {
          if (error) {
            return this.orderTrackingUpdateCallback(error, null)
          } else {
            var justTheBody = body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectOrderTrackingUpdateResponse'].return
            delete justTheBody['xsi:type']
            var bodyError = (typeof justTheBody.error !== 'undefined') ? xmlNodeValue(justTheBody.error) : 0
            if (bodyError !== 0) {
              var eMessage = 'Code ' + parseInt(bodyError)
              if (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') {
                eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage)
              }
              error = new Error(eMessage)
              return this.orderTrackingUpdateCallback(error, null)
            } else {
              var bodyObj = {
                error: parseInt(bodyError),
                errorMessage: (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') ? xmlNodeValue(justTheBody.errorMessage) : '',
                errorMessageDetail: (typeof xmlNodeValue(justTheBody.errorMessageDetail) === 'string') ? xmlNodeValue(justTheBody.errorMessageDetail) : ''
              }
              let otuResponseArgs = {
                trackingLink: 'string'
              }
              for (let argName in otuResponseArgs) {
                let setPropVal = setPropertyIf(justTheBody, bodyObj, argName, otuResponseArgs[argName])
              }
              if (this.stripWrapper) {
                return this.orderTrackingUpdateCallback(false, bodyObj)
              } else {
                var orderTrackingUpdateResult = {
                  body: bodyObj,
                  statusCode: response.statusCode,
                  request: this.orderTrackingUpdateRequest
                }
                if (this.returnRaw) {
                  orderTrackingUpdateResult.raw = response.body
                }
                if (this.returnSoapHeader) {
                  let soapHeader = body['SOAP-ENV:Envelope']
                  delete soapHeader['SOAP-ENV:Body']
                  orderTrackingUpdateResult.soapHeader = JSON.stringify(soapHeader)
                }
                if (this.returnFullResponse) {
                  orderTrackingUpdateResult.response = response
                }
                return this.orderTrackingUpdateCallback(false, orderTrackingUpdateResult)
              }
            }
          }
        }.bind(this))
      }
    }


    /*****
    callback = function w/ two arguments: (error, result)

    orOrderNumber = string(100)
    *****/
    orderRemove (orOrderNumber, callback) {
      if (typeof callback !== 'function' || callback.length !== 2) {
        throw new TypeError('FECB client.orderRemove was passed an invalid callback')
      }
      else {
        this.orderRemoveCallback = callback
        if (typeof orOrderNumber !== 'string') {
          throw new TypeError('FECB client.orderRemove was passed an invalid order number')
        }
        else {
          this.orderRemoveRequest = {
            language: this.language,
            partnerKey: this.merchantKey,
            orderNumber: otuRequest.trim().substring(0, 100)
          }
          this.orderRemoveRequestXml = '<partnerKey xsi:type="xsd:string">' + this.orderRemoveRequest.partnerKey + '</partnerKey>'
          this.orderRemoveRequestXml += '<language xsi:type="xsd:string">' + this.orderRemoveRequest.language + '</language>'
          this.orderRemoveRequestXml += '<orderNumber xsi:type="xsd:string">' + this.orderRemoveRequest.orderNumber + '</orderNumber>'
          this.performRequest('ConnectOrderRemove', this.orderRemoveRequestXml, function (error, response, body) {
            if (error) {
              return this.orderRemoveCallback(error, null)
            } else {
              var justTheBody = body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectOrderRemoveResponse'].return
              delete justTheBody['xsi:type']
              var bodyError = (typeof justTheBody.error !== 'undefined') ? xmlNodeValue(justTheBody.error) : 0
              if (bodyError !== 0) {
                var eMessage = 'Code ' + parseInt(bodyError)
                if (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') {
                  eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage)
                }
                error = new Error(eMessage)
                return this.orderRemoveCallback(error, null)
              } else {
                var bodyObj = {
                  error: parseInt(bodyError),
                  errorMessage: (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') ? xmlNodeValue(justTheBody.errorMessage) : '',
                  errorMessageDetail: (typeof xmlNodeValue(justTheBody.errorMessageDetail) === 'string') ? xmlNodeValue(justTheBody.errorMessageDetail) : ''
                }
                if (this.stripWrapper) {
                  return this.orderRemoveCallback(false, bodyObj)
                } else {
                  var orderRemoveResult = {
                    body: bodyObj,
                    statusCode: response.statusCode,
                    request: this.orderRemoveRequest
                  }
                  if (this.returnRaw) {
                    orderRemoveResult.raw = response.body
                  }
                  if (this.returnSoapHeader) {
                    let soapHeader = body['SOAP-ENV:Envelope']
                    delete soapHeader['SOAP-ENV:Body']
                    orderRemoveResult.soapHeader = JSON.stringify(soapHeader)
                  }
                  if (this.returnFullResponse) {
                    orderRemoveResult.response = response
                  }
                  return this.orderRemoveCallback(false, orderRemoveResult)
                }
              }
            }
          }.bind(this))
        }
      }
    }

    /*****
    callback = function w/ two arguments: (error, result)

    ssItems = [
      {
        productID: 'string'
      }
    ]
    *****/
    skuStatus (ssItems, callback) {
      if (typeof callback !== 'function' || callback.length !== 2) {
        throw new TypeError('FECB client.skuStatus was passed an invalid callback')
      }
      else {
        this.skuStatusCallback = callback
        if (typeof ssItems !== 'object' || !(Array.isArray(ssItems))) {
          throw new TypeError('FECB client.skuStatus was passed an invalid items array')
        }
        else {
          this.skuStatusRequest = {
            language: this.language,
            partnerKey: this.merchantKey
          }
          this.skuStatusRequestXml = '<partnerKey xsi:type="xsd:string">' + this.skuStatusRequest.partnerKey + '</partnerKey>'
          this.skuStatusRequestXml += '<language xsi:type="xsd:string">' + this.skuStatusRequest.language + '</language>'
          this.skuStatusRequestXml += '<items xsi:type="v4:ArrayOfProductsIdDat" soapenc:arrayType="v4:ProductsIdDat[]">'
          let skuStatusRequestItems = []
          for (let i = 0; i < ssItems.length; i++) {
            skuStatusRequestItems[i] = new ProductsIdDat(ssItems[i].productID)
            this.skuStatusRequestXml += skuStatusRequestItems[i].getXmlString()
          }
          this.skuStatusRequestXml += '</items>'
          this.skuStatusRequest.items = skuStatusRequestItems
          this.performRequest('ConnectSkuStatus', this.skuStatusRequestXml, function (error, response, body) {
            if (error) {
              return this.skuStatusCallback(error, null)
            }
            else {
              var justTheBody = body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectSkuStatusResponse'].return
              delete justTheBody['xsi:type']
              var bodyError = (typeof justTheBody.error !== 'undefined') ? xmlNodeValue(justTheBody.error) : 0
              if (bodyError !== 0) {
                var eMessage = 'Code ' + parseInt(bodyError)
                if (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') {
                  eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage)
                }
                error = new Error(eMessage)
                return this.skuStatusCallback(error, null)
              } else {
                var bodyObj = {
                  error: parseInt(bodyError),
                  errorMessage: (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') ? xmlNodeValue(justTheBody.errorMessage) : '',
                  errorMessageDetail: (typeof xmlNodeValue(justTheBody.errorMessageDetail) === 'string') ? xmlNodeValue(justTheBody.errorMessageDetail) : ''
                }
                if (typeof justTheBody.items === 'object' && Array.isArray(justTheBody.items.item)) {
                  bodyObj.items = xmlObjectNodeArray(justTheBody.items.item, SkuStatusDat)
                }
                if (this.stripWrapper) {
                  return this.skuStatusCallback(false, bodyObj)
                } else {
                  var skuStatusResult = {
                    body: bodyObj,
                    statusCode: response.statusCode,
                    request: this.skuStatusRequest
                  }
                  if (this.returnRaw) {
                    skuStatusResult.raw = response.body
                  }
                  if (this.returnSoapHeader) {
                    let soapHeader = body['SOAP-ENV:Envelope']
                    delete soapHeader['SOAP-ENV:Body']
                    skuStatusResult.soapHeader = JSON.stringify(soapHeader)
                  }
                  if (this.returnFullResponse) {
                    skuStatusResult.response = response
                  }
                  return this.skuStatusCallback(false, skuStatusResult)
                }
              }
            }
          }.bind(this))
        }
      }
    }
  },

  clientPromise: class FedExCBClientPromise {
    constructor (args) {
      this.wsdlUri = fecbUri + '?wsdl'
      this.serviceUri = fecbUri
      if (typeof args.language !== 'string' || args.language.trim().length !== 2) {
        throw new TypeError('FECB client constructor requires args.language to be a two character string')
      } else {
        this.language = isValidLanguage(args.language.trim().toLowerCase()) ? args.language.trim().toLowerCase() : 'en'
      }
      if (typeof args.merchantKey !== 'string' || args.merchantKey.trim().length >= 65) {
        throw new TypeError('FECB client constructor requires args.merchantKey to be a string of 64 characters or fewer')
      } else {
        this.merchantKey = args.merchantKey.trim().substring(0, 64)
      }
      this.returnRaw = !!((typeof args.returnRaw !== 'undefined' && args.returnRaw))
      this.returnSoapHeader = !!((typeof args.returnSoapHeader !== 'undefined' && args.returnSoapHeader))
      this.stripWrapper = !((typeof args.stripWrapper !== 'undefined' || !args.stripWrapper))
      this.returnFullResponse = !((typeof args.returnFullResponse !== 'undefined' || !args.returnFullResponse))
    }

    performRequest (action, body) {
      this.performRequestXml = '<soapenv:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v4="' + this.serviceUri + '" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/"><soapenv:Header/><soapenv:Body><v4:' + action + ' soapenv:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><request xsi:type="v4:' + action + 'Request">' + body + '</request></v4:' + action + '></soapenv:Body></soapenv:Envelope>'
      var parser = new xml2js.Parser({explicitArray: false, trim: true, mergeAttrs: true})
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
            SOAPAction: 'https://api.crossborder.fedex.com/services/v4.4#' + action
          },
          resolveWithFullResponse: true,
          simple: false
        }
        return requestAsync(requestOptions)
      }).then((response) => {
        this.performRequestResponse = response
        return parser.parseStringAsync(body)
      }).then((parsedBody) => {
        return Promise.resolve({response: this.performRequestResponse, body: parsedBody})
      }).catch((error) => {
        return Promise.resolve({response: this.performRequestResponse, parseError: error})
      })
    }

    productInfo (itemsArray) {
      this.productInfoItems = []
      var xmlItems = ''
      if (typeof itemsArray === 'object' && Array.isArray(itemsArray) && itemsArray.length > 0) {
        for (let i = 0; i < itemsArray.length; i++) {
          var optionalArgs = (typeof itemsArray[i].optionalArgs === 'object' && itemsArray[i].optionalArgs !== null) ? itemsArray[i].optionalArgs : null
          var itemInformation = (typeof itemsArray[i].itemInformation === 'object' && itemsArray[i].itemInformation !== null) ? new CartonsDat(itemsArray[i].itemInformation.l, itemsArray[i].itemInformation.w, itemsArray[i].itemInformation.h, itemsArray[i].itemInformation.wt) : new CartonsDat(null, null, null, null)
          var productInfoObj = new ProductInfoDat(itemsArray[i].id, itemsArray[i].description, itemsArray[i].price, itemsArray[i].currency, itemsArray[i].exportHub, itemsArray[i].origin, itemInformation, optionalArgs)
          this.productInfoItems.push(productInfoObj)
          xmlItems += productInfoObj.getXmlString()
        }
        this.productInfoRequest = {
          items: this.productInfoItems,
          language: this.language,
          partnerKey: this.merchantKey
        }
        this.productInfoRequestXML = '<partnerKey xsi:type="xsd:string">' + this.productInfoRequest.partnerKey + '</partnerKey>'
        this.productInfoRequestXML += '<language xsi:type="xsd:string">' + this.productInfoRequest.language + '</language>'
        this.productInfoRequestXML += '<items xsi:type="v4:ArrayOfProductInfoDat" soapenc:arrayType="v4:ProductInfoDat[]">' + xmlItems + '</items>'
        return this.performRequest('ConnectProductInfo', this.productInfoRequestXML)
        .then((resultObject) => {
          var justTheBody = typeof resultObject.body === 'undefined' ? false : resultObject.body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectProductInfoResponse'].return
          if (justTheBody) {
            delete justTheBody['xsi:type']
            var bodyError = (typeof justTheBody.error !== 'undefined') ? xmlNodeValue(justTheBody.error) : 0
            if (bodyError !== 0) {
              var eMessage = 'Code ' + parseInt(bodyError)
              if (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') {
                eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage)
              }
              var error = new Error(eMessage)
              return Promise.reject(error)
            } else {
              var bodyObj = {
                error: parseInt(bodyError),
                errorMessage: xmlNodeValue(justTheBody.errorMessage),
                errorMessageDetail: xmlNodeValue(justTheBody.errorMessageDetail)
              }
              if (this.stripWrapper) {
                return Promise.resolve(bodyObj)
              } else {
                var productInfoResult = {
                  body: bodyObj,
                  statusCode: resultObject.response.statusCode,
                  request: this.productInfoRequest
                }
                if (this.returnRaw) {
                  productInfoResult.raw = resultObject.response.body
                }
                if (this.returnSoapHeader) {
                  let soapHeader = resultObject.body['SOAP-ENV:Envelope']
                  delete soapHeader['SOAP-ENV:Body']
                  productInfoResult.soapHeader = JSON.stringify(soapHeader)
                }
                if (this.returnFullResponse) {
                  productInfoResult.response = resultObject.response
                }
                return Promise.resolve(productInfoResult)
              }
            }
          } else {
            return Promise.reject(resultObject)
          }
        }).catch((error) => {
          return Promise.reject(error)
        })
      }
      else {
        return Promise.reject(new TypeError('FECB clientPromise.productInfo was passed an invalid array of items'))
      }
    }

    /*****
      lcRequest = {
        items: [
          {
            productID: 'string',
            quantity: 'int',
            price: 'float(13,4)',
            itemExportHubCountry: 'string(2)'
          }
        ],
        shipmentDestinationCountry: 'string(2)',
        optionalArgs: {
          privateIndividuals: 'string(1); "Y" or "N"',
          shipmentDestinationAddress1: 'string(250)',
          shipmentDestinationAddress2: 'string(250)',
          shipmentDestinationCity: 'string(50)',
          shipmentDestinationStateOrProvince: 'string(50)',
          shipmentDestinationZip: 'string(50)',
          domesticShippingCost: 'float(13,4)',
          insuranceFlag: 'int(1); 0 or 1',
          orderValuationCurrency: 'string(3)',
          requestedCostReturnedCurrency: 'string(3)',
          service: 'int(1); 0 (express), 1 (standard), or 2 (economy)'
        }
      }
    *****/
    landedCost (lcRequest) {
      if (typeof lcRequest === 'undefined' || typeof lcRequest.items !== 'object' || !(Array.isArray(lcRequest.items)) || typeof lcRequest.shipmentDestinationCountry !== 'string') {
        return Promise.reject(new TypeError('FECB clientPromise.landedCost was passed an invalid array of items'))
      }
      else {
        let sdc = lcRequest.shipmentDestinationCountry.trim().toUpperCase().substring(0, 3)
        this.landedCostRequest = {
          language: this.language,
          partnerKey: this.merchantKey,
          shipmentDestinationCountry: isValidCountry(sdc) ? sdc : 'US'
        }
        this.landedCostRequestXml = '<partnerKey xsi:type="xsd:string">' + this.landedCostRequest.partnerKey + '</partnerKey>'
        this.landedCostRequestXml += '<language xsi:type="xsd:string">' + this.landedCostRequest.language + '</language>'
        this.landedCostRequestXml += '<shipmentDestinationCountry xsi:type="xsd:string">' + this.landedCostRequest.shipmentDestinationCountry + '</shipmentDestinationCountry>'
        this.landedCostRequestXml += '<items xsi:type="v4:ArrayOfProductInfo" soapenc:arrayType="v4:ProductInfo[]">'
        let landedCostItems = []
        for (let i = 0; i < lcRequest.items.length; i++) {
          landedCostItems[i] = new ProductInfo(lcRequest.items[i].id, lcRequest.items[i].quantity, lcRequest.items[i].price, lcRequest.items[i].exportHub)
          this.landedCostRequestXml += landedCostItems[i].getXmlString()
        }
        this.landedCostRequestXml += '</items>'
        this.landedCostRequest.items = landedCostItems
        if (typeof lcRequest.optionalArgs === 'object') {
          let lcRequestOptionalArgs = {
            privateIndividuals: 'stringYOrN',
            shipmentDestinationAddress1: 'string250',
            shipmentDestinationAddress2: 'string250',
            shipmentDestinationCity: 'string50',
            shipmentDestinationStateOrProvince: 'string50',
            shipmentDestinationZip: 'string50',
            domesticShippingCost: 'float4',
            insuranceFlag: 'intBool',
            orderValuationCurrency: 'validCurrency',
            requestedCostReturnedCurrency: 'validCurrency',
            service: 'intRange0to3'
          }

          for (let optArgName in lcRequestOptionalArgs) {
            let setPropVal = setPropertyIf(lcRequest.optionalArgs, this.landedCostRequest, optArgName, lcRequestOptionalArgs[optArgName])
            this.landedCostRequestXml += setPropVal ? '<' + optArgName + ' xsi:type="' + propertyTypeMap[lcRequestOptionalArgs[optArgName]] + '">' + setPropVal + '</' + optArgName + '>' : ''
          }
        }
        return this.performRequest('ConnectLandedCost', this.landedCostRequestXml)
        .then((resultObject) => {
          var justTheBody = typeof resultObject.body === 'undefined' ? false : body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectLandedCostResponse'].return
          if (justTheBody) {
            delete justTheBody['xsi:type']
            var bodyError = (typeof justTheBody.error !== 'undefined') ? xmlNodeValue(justTheBody.error) : 0
            if (bodyError !== 0) {
              var eMessage = 'Code ' + parseInt(bodyError)
              if (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') {
                eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage)
              }
              error = new Error(eMessage)
              return Promise.reject(error)
            }
            else {
              var bodyObj = {
                error: parseInt(bodyError),
                errorMessage: (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') ? xmlNodeValue(justTheBody.errorMessage) : '',
                errorMessageDetail: (typeof xmlNodeValue(justTheBody.errorMessageDetail) === 'string') ? xmlNodeValue(justTheBody.errorMessageDetail) : ''
              }
              let lcResponseArgs = {
                dutyCost: 'float4',
                taxCost: 'float4',
                shippingCost: 'float4',
                insuranceCost: 'float4',
                ddpAvailable: 'intBool',
                landedCostTransactionId: 'string',
                orderValuationCurrencyCode: 'validCurrency',
                orderValuationCurrencyExchangeRate: 'string',
                requestedCostReturnedCurrencyCode: 'validCurrency',
                requestedCostReturnedCurrencyExchangeRate: 'string',
                service: 'intRange0to3'
              }
              for (let argName in lcResponseArgs) {
                let setPropVal = setPropertyIf(justTheBody, bodyObj, argName, lcResponseArgs[argName])
              }
              if (typeof justTheBody.items === 'object' && Array.isArray(justTheBody.items.item)) {
                bodyObj.items = xmlObjectNodeArray(justTheBody.items.item, LandedProduct)
              }
              if (this.stripWrapper) {
                return Promise.resolve(bodyObj)
              }
              else {
                var landedCostResult = {
                  body: bodyObj,
                  statusCode: response.statusCode,
                  request: this.landedCostRequest
                }
                if (this.returnRaw) {
                  landedCostResult.raw = response.body
                }
                if (this.returnSoapHeader) {
                  let soapHeader = body['SOAP-ENV:Envelope']
                  delete soapHeader['SOAP-ENV:Body']
                  landedCostResult.soapHeader = JSON.stringify(soapHeader)
                }
                if (this.returnFullResponse) {
                  landedCostResult.response = response
                }
                return Promise.resolve(false, landedCostResult)
              }
            }
          }
          else {
            return Promise.reject(resultObject)
          }
        }).catch((error) => {
          return Promise.reject(error)
        })
      }
    }

    /*****
    oRequest = {
      orderNumber: 'string(100)',
      landedCostTransactionID
      shipToFirstName: 'string(100)',
      shipToLastName: 'string(100)',
      shipToAddress1: 'string',
      shipToCity: 'string(100)',
      shipToCountry: 'string(2)'
      ordersInfo: [
        {
          id: 'string',
          quantity: 'int',
          price: 'float(13,4)',
          currency: 'string(3),
          optionalArgs: {
            exportHub: 'string(3)',
            carrier: 'int(1)',
            trackingNumber: 'string(100)
          }
        }
      ],
      optionalArgs: {
        shipToBusiness: 'string(250)',
        shipToAddress2: 'string(250)',
        shipToAddress3: 'string(250)',
        shipToState: 'string(50)',
        shipToZip: 'string(50)',
        shipToPhone: 'string(50)',
        shipToEmail: 'string',
        shipToTaxID: 'string',
        repackage: 'int(1); 0 (don't repackage), or 1 (repackage)',
        dutyPaid: 'int(1); 0 (doesn't pay), or 1 (does pay)',
        insurance: 'int(1); 0 (not insured), or 1 (insured)',
        emailCustomerTracking: 'int(1); 0 (don't send link to customer), or 1 (send tracking link to customer)',
        bongoCustomerService: 'int(1); 0 (don't show customer FECB support link/chat), or 1 (show customer FECB support link/chat)',
        sellingStoreName: 'string(100)',
        sellingStoreURL: 'string(250)',
        sellingStoreURLCS: 'string(250)',
        sellingStoreURLImage: 'string(250)'
      }
    }
    *****/
    order (oRequest) {
      if (typeof oRequest !== 'object' || typeof oRequest.orderNumber !== 'string' || typeof oRequest.landedCostTransactionID !== 'string' || typeof oRequest.shipToFirstName !== 'string' || typeof oRequest.shipToLastName !== 'string' || typeof oRequest.shipToAddress1 !== 'string' || typeof oRequest.shipToCity !== 'string' || typeof oRequest.shipToCountry !== 'string' || typeof oRequest.ordersInfo !== 'object' || Array.isArray(oRequest.ordersInfo) || oRequest.ordersInfo.length < 1) {
        return Promise.reject(new TypeError('FECB clientPromise.order was passed an invalid request object'))
      }
      else {
        let stc = oRequest.shipToCountry.trim().toUpperCase().substring(0, 3)
        let stfn = oRequest.shipToFirstName.trim().toUpperCase().substring(0, 100)
        this.orderRequest = {
          language: this.language,
          partnerKey: this.merchantKey,
          orderNumber: oRequest.orderNumber.trim().toUpperCase().substring(0, 100),
          shipToFirstName: oRequest.shipToFirstName.trim().toUpperCase().substring(0, 100),
          shipToLastName: oRequest.shipToLastName.trim().toUpperCase().substring(0, 100),
          shipToAddress1: oRequest.shipToAddress1.trim().toUpperCase().substring(0, 255),
          shipToCity: oRequest.shipToCity.trim().toUpperCase().substring(0, 100),
          shipToCountry: isValidCountry(stc) ? stc : 'US'
        }
        this.ordersInfo = []
        var xmlOrdersInfo = ''
        for (let i = 0; i < oRequest.ordersInfo.length: i++) {
          let optionalArgs = (typeof oRequest.ordersInfo[i].optionalArgs === 'object' && oRequest.ordersInfo[i].optionalArgs !== null) ? oRequest.ordersInfo[i].optionalArgs : null
          let orderInformationObj = new OrderInformation(
            oRequest.ordersInfo[i].id,
            oRequest.ordersInfo[i].quantity,
            oRequest.ordersInfo[i].price,
            oRequest.ordersInfo[i].currency,
            optionalArgs
          )
          this.ordersInfo.push(orderInformationObj)
          xmlOrdersInfo += orderInformationObj.getXmlString()
        }
        this.orderRequestXML = '<partnerKey xsi:type="xsd:string">' + this.orderRequest.partnerKey + '</partnerKey>'
        this.orderRequestXML += '<language xsi:type="xsd:string">' + this.orderRequest.language + '</language>'
        this.orderRequestXML += '<orderNumber xsi:type="xsd:string">' + this.orderRequest.orderNumber + '</orderNumber>'
        this.orderRequestXML += '<landedCostTransactionID xsi:type="xsd:string">' + this.orderRequest.landedCostTransactionID + '</landedCostTransactionID>'
        this.orderRequestXML += '<ordersInfo xsi:type="v4:ArrayOfOrderInformation" soapenc:arrayType="v4:OrderInformation[]">' + xmlOrdersInfo + '</ordersInfo>'
        this.orderRequestXML += '<shipToFirstName xsi:type="xsd:string">' + this.orderRequest.shipToFirstName + '</shipToFirstName>'
        this.orderRequestXML += '<shipToLastName xsi:type="xsd:string">' + this.orderRequest.shipToLastName + '</shipToLastName>'
        this.orderRequestXML += '<shipToAddress1 xsi:type="xsd:string">' + this.orderRequest.shipToAddress1 + '</shipToAddress1>'
        this.orderRequestXML += '<shipToCity xsi:type="xsd:string">' + this.orderRequest.shipToCity + '</shipToCity>'
        this.orderRequestXML += '<shipToCountry xsi:type="xsd:string">' + this.orderRequest.shipToCountry + '</shipToCountry>'
        if (typeof oRequest.optionalArgs === 'object') {
          let oRequestOptionalArgs = {
            shipToBusiness: 'string250',
            shipToAddress2: 'string250',
            shipToAddress3: 'string250',
            shipToState: 'string50',
            shipToZip: 'string50',
            shipToPhone: 'string50',
            shipToEmail: 'string',
            shipToTaxID: 'string',
            repackage: 'intBool',
            dutyPaid: 'intBool',
            insurance: 'intBool',
            emailCustomerTracking: 'intBool',
            bongoCustomerService: 'intBool',
            sellingStoreName: 'string100',
            sellingStoreURL: 'string250',
            sellingStoreURLCS: 'string250',
            sellingStoreURLImage: 'string250'
          }
          for (let optArgName in oRequestOptionalArgs) {
            let setPropVal = setPropertyIf(oRequest.optionalArgs, this.orderRequest, optArgName, oRequestOptionalArgs[optArgName])
            this.orderRequestXML += setPropVal ? '<' + optArgName + ' xsi:type="' + propertyTypeMap[oRequestOptionalArgs[optArgName]] + '">' + setPropVal + '</' + optArgName + '>' : ''
          }
        }
        return this.performRequest('ConnectOrder', this.orderRequestXML)
        .then((resultObject) => {
          var justTheBody = typeof resultObject.body === 'undefined' ? false :  body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectOrderResponse'].return
          if (justTheBody) {
            delete justTheBody['xsi:type']
            var bodyError = (typeof justTheBody.error !== 'undefined') ? xmlNodeValue(justTheBody.error) : 0
            if (bodyError !== 0) {
              var eMessage = 'Code ' + parseInt(bodyError)
              if (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') {
                eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage)
              }
              error = new Error(eMessage)
              return Promise.reject(error)
            } else {
              var bodyObj = {
                error: parseInt(bodyError),
                errorMessage: (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') ? xmlNodeValue(justTheBody.errorMessage) : '',
                errorMessageDetail: (typeof xmlNodeValue(justTheBody.errorMessageDetail) === 'string') ? xmlNodeValue(justTheBody.errorMessageDetail) : ''
              }
              let oResponseArgs = {
                trackingLink: 'string'
              }
              for (let argName in oResponseArgs) {
                let setPropVal = setPropertyIf(justTheBody, bodyObj, argName, oResponseArgs[argName])
              }
              if (this.stripWrapper) {
                return Promise.resolve(bodyObj)
              } else {
                var orderResult = {
                  body: bodyObj,
                  statusCode: response.statusCode,
                  request: this.orderRequest
                }
                if (this.returnRaw) {
                  orderResult.raw = response.body
                }
                if (this.returnSoapHeader) {
                  let soapHeader = body['SOAP-ENV:Envelope']
                  delete soapHeader['SOAP-ENV:Body']
                  orderResult.soapHeader = JSON.stringify(soapHeader)
                }
                if (this.returnFullResponse) {
                  orderResult.response = response
                }
                return Promise.resolve(orderResult)
              }
            }
          }
        }).catch((error) => {
          return Promise.reject(error)
        })
      }
    }

    /*****
    otuRequest = {
      orderNumber: 'string(100)',
      trackList: [
        {
          productID: 'string',
          trackingNumber: 'string(100)',
          quantity: 'int',
          carrier: 'int(1)'
        }
      ]
    }
    *****/
    orderTrackingUpdate (otuRequest) {

      if (typeof otuRequest === 'undefined' || typeof otuRequest.trackList !== 'object' || !(Array.isArray(otuRequest.trackList)) || typeof otuRequest.orderNumber !== 'string') {
        return Promise.reject(new TypeError('FECB client.orderTrackingUpdate was passed an invalid request object'))
      }
      else {
        this.orderTrackingUpdateRequest = {
          language: this.language,
          partnerKey: this.merchantKey,
          orderNumber: otuRequest.trim().substring(0, 100)
        }
        this.orderTrackingUpdateRequestXml = '<partnerKey xsi:type="xsd:string">' + this.orderTrackingUpdateRequest.partnerKey + '</partnerKey>'
        this.orderTrackingUpdateRequestXml += '<language xsi:type="xsd:string">' + this.orderTrackingUpdateRequest.language + '</language>'
        this.orderTrackingUpdateRequestXml += '<orderNumber xsi:type="xsd:string">' + this.orderTrackingUpdateRequest.orderNumber + '</orderNumber>'
        this.orderTrackingUpdateRequestXml += '<trackList xsi:type="v4:ArrayOfTrackingList" soapenc:arrayType="v4:TrackingList[]">'
        let orderTrackingUpdateRequestTrackList = []
        for (let i = 0; i < otuRequest.trackList.length; i++) {
          orderTrackingUpdateRequestTrackList[i] = new TrackingList(otuRequest.trackList[i].productID, otuRequest.trackList[i].trackingNumber, otuRequest.trackList[i].quantity, otuRequest.trackList[i].carrier)
          this.orderTrackingUpdateRequestXml += orderTrackingUpdateRequestTrackList[i].getXmlString()
        }
        this.orderTrackingUpdateRequestXml += '</trackList>'
        this.orderTrackingUpdateRequest.trackList = orderTrackingUpdateRequestTrackList
        return this.performRequest('ConnectOrderTrackingUpdate', this.orderTrackingUpdateRequestXml)
        .then((resultObject) => {
          var justTheBody = typeof resultObject.body === 'undefined' ? false : body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectOrderTrackingUpdateResponse'].return
          if (justTheBody) {
            delete justTheBody['xsi:type']
            var bodyError = (typeof justTheBody.error !== 'undefined') ? xmlNodeValue(justTheBody.error) : 0
            if (bodyError !== 0) {
              var eMessage = 'Code ' + parseInt(bodyError)
              if (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') {
                eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage)
              }
              error = new Error(eMessage)
              return Promise.reject(error)
            }
            else {
              var bodyObj = {
                error: parseInt(bodyError),
                errorMessage: (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') ? xmlNodeValue(justTheBody.errorMessage) : '',
                errorMessageDetail: (typeof xmlNodeValue(justTheBody.errorMessageDetail) === 'string') ? xmlNodeValue(justTheBody.errorMessageDetail) : ''
              }
              let otuResponseArgs = {
                trackingLink: 'string'
              }
              for (let argName in otuResponseArgs) {
                let setPropVal = setPropertyIf(justTheBody, bodyObj, argName, otuResponseArgs[argName])
              }
              if (this.stripWrapper) {
                return Promise.resolve(bodyObj)
              } else {
                var orderTrackingUpdateResult = {
                  body: bodyObj,
                  statusCode: response.statusCode,
                  request: this.orderTrackingUpdateRequest
                }
                if (this.returnRaw) {
                  orderTrackingUpdateResult.raw = response.body
                }
                if (this.returnSoapHeader) {
                  let soapHeader = body['SOAP-ENV:Envelope']
                  delete soapHeader['SOAP-ENV:Body']
                  orderTrackingUpdateResult.soapHeader = JSON.stringify(soapHeader)
                }
                if (this.returnFullResponse) {
                  orderTrackingUpdateResult.response = response
                }
                return Promise.resolve(orderTrackingUpdateResult)
              }
            }
          } else {
            return Promise.reject(resultObject)
          }
        }).catch((error) => {
          return Promise.reject(error)
        })
      }
    }

    /*****
    orOrderNumber = string(100)
    *****/
    orderRemove (orOrderNumber) {

      if (typeof orOrderNumber !== 'string') {
        return Promise.reject(new TypeError('FECB client.orderRemove was passed an invalid order number'))
      }
      else {
        this.orderRemoveRequest = {
          language: this.language,
          partnerKey: this.merchantKey,
          orderNumber: otuRequest.trim().substring(0, 100)
        }
        this.orderRemoveRequestXml = '<partnerKey xsi:type="xsd:string">' + this.orderRemoveRequest.partnerKey + '</partnerKey>'
        this.orderRemoveRequestXml += '<language xsi:type="xsd:string">' + this.orderRemoveRequest.language + '</language>'
        this.orderRemoveRequestXml += '<orderNumber xsi:type="xsd:string">' + this.orderRemoveRequest.orderNumber + '</orderNumber>'
        return this.performRequest('ConnectOrderRemove', this.orderRemoveRequestXml)
        .then((resultObject) => {
          var justTheBody = typeof resultObject.body === 'undefined' ? false : body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectOrderRemoveResponse'].return
          if (justTheBody) {
            delete justTheBody['xsi:type']
            var bodyError = (typeof justTheBody.error !== 'undefined') ? xmlNodeValue(justTheBody.error) : 0
            if (bodyError !== 0) {
              var eMessage = 'Code ' + parseInt(bodyError)
              if (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') {
                eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage)
              }
              error = new Error(eMessage)
              return Promise.reject(error)
            }
            else {
              var bodyObj = {
                error: parseInt(bodyError),
                errorMessage: (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') ? xmlNodeValue(justTheBody.errorMessage) : '',
                errorMessageDetail: (typeof xmlNodeValue(justTheBody.errorMessageDetail) === 'string') ? xmlNodeValue(justTheBody.errorMessageDetail) : ''
              }
              if (this.stripWrapper) {
                return Promise.resolve(bodyObj)
              } else {
                var orderRemoveResult = {
                  body: bodyObj,
                  statusCode: response.statusCode,
                  request: this.orderRemoveRequest
                }
                if (this.returnRaw) {
                  orderRemoveResult.raw = response.body
                }
                if (this.returnSoapHeader) {
                  let soapHeader = body['SOAP-ENV:Envelope']
                  delete soapHeader['SOAP-ENV:Body']
                  orderRemoveResult.soapHeader = JSON.stringify(soapHeader)
                }
                if (this.returnFullResponse) {
                  orderRemoveResult.response = response
                }
                return Promise.resolve(orderRemoveResult)
              }
            }
          }
        }).catch((error) => {
          return Promise.reject(error)
        })
      }

    }

    /*****
    ssItems = [
      {
        productID: 'string'
      }
    ]
    *****/
    skuStatus (ssItems) {

      if (typeof ssItems !== 'object' || !(Array.isArray(ssItems))) {
        return Promise.reject(new TypeError('FECB client.skuStatus was passed an invalid items array'))
      }
      else {
        this.skuStatusRequest = {
          language: this.language,
          partnerKey: this.merchantKey
        }
        this.skuStatusRequestXml = '<partnerKey xsi:type="xsd:string">' + this.skuStatusRequest.partnerKey + '</partnerKey>'
        this.skuStatusRequestXml += '<language xsi:type="xsd:string">' + this.skuStatusRequest.language + '</language>'
        this.skuStatusRequestXml += '<items xsi:type="v4:ArrayOfProductsIdDat" soapenc:arrayType="v4:ProductsIdDat[]">'
        let skuStatusRequestItems = []
        for (let i = 0; i < ssItems.length; i++) {
          skuStatusRequestItems[i] = new ProductsIdDat(ssItems[i].productID)
          this.skuStatusRequestXml += skuStatusRequestItems[i].getXmlString()
        }
        this.skuStatusRequestXml += '</items>'
        this.skuStatusRequest.items = skuStatusRequestItems
        return this.performRequest('ConnectSkuStatus', this.skuStatusRequestXml)
        .then((resultObject) => {
          var justTheBody = typeof resultObject.body === 'undefined' ? false : body['SOAP-ENV:Envelope']['SOAP-ENV:Body']['ns1:ConnectSkuStatusResponse'].return
          if (justTheBody) {
            delete justTheBody['xsi:type']
            var bodyError = (typeof justTheBody.error !== 'undefined') ? xmlNodeValue(justTheBody.error) : 0
            if (bodyError !== 0) {
              var eMessage = 'Code ' + parseInt(bodyError)
              if (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') {
                eMessage += ' — ' + xmlNodeValue(justTheBody.errorMessage)
              }
              error = new Error(eMessage)
              return Promise.reject(error)
            }
            else {
              var bodyObj = {
                error: parseInt(bodyError),
                errorMessage: (typeof xmlNodeValue(justTheBody.errorMessage) === 'string') ? xmlNodeValue(justTheBody.errorMessage) : '',
                errorMessageDetail: (typeof xmlNodeValue(justTheBody.errorMessageDetail) === 'string') ? xmlNodeValue(justTheBody.errorMessageDetail) : ''
              }
              if (typeof justTheBody.items === 'object' && Array.isArray(justTheBody.items.item)) {
                bodyObj.items = xmlObjectNodeArray(justTheBody.items.item, SkuStatusDat)
              }
              if (this.stripWrapper) {
                return Promise.resolve(bodyObj)
              }
              else {
                var skuStatusResult = {
                  body: bodyObj,
                  statusCode: response.statusCode,
                  request: this.skuStatusRequest
                }
                if (this.returnRaw) {
                  skuStatusResult.raw = response.body
                }
                if (this.returnSoapHeader) {
                  let soapHeader = body['SOAP-ENV:Envelope']
                  delete soapHeader['SOAP-ENV:Body']
                  skuStatusResult.soapHeader = JSON.stringify(soapHeader)
                }
                if (this.returnFullResponse) {
                  skuStatusResult.response = response
                }
                return Promise.resolve(skuStatusResult)
              }
            }
          }
          else {
            return Promise.reject(resultObject)
          }
        }).catch((error) => {
          return Promise.reject(error)
        })
      }
    }
  },

  // Classes

  cartonsDat: CartonsDat,

  productInfoDat: ProductInfoDat,

  productInfo: ProductInfo,

  orderInformation: OrderInformation,

  trackingList: TrackingList,

  productsIdDat: ProductsIdDat,

  // Constants

  exportHubs: exportHubArray,

  countryCodes: countryCodeArray,

  languages: languageArray,

  carriers: carriers,

  // Functions

  validateLanguage: isValidLanguage,

  validateCountry: isValidCountry,

  validateCurrency: isValidCurrency,

  getCountryForHub: getHubCountry,

  getCarrierCode: getCarrierCode,

  // Test Functions

  testFunctions: {
    getConstructorArgNames: getConstructorArgNames,
    xmlNodeValue: xmlNodeValue,
    xmlObjectNodeArray: xmlObjectNodeArray,
    setPropertyIf: setPropertyIf
  },

  testClasses: {
    LandedProduct: LandedProduct,
    SkuStatusDat: SkuStatusDat
  }

}
