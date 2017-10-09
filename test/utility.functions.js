'use-strict';
let chai = require('chai');
chai.should();
let util = require('util');
const Promise = require('bluebird');
const xml2js = Promise.promisifyAll(require('xml2js'));
let Parser = new xml2js.Parser({explicitArray: false, trim: true, mergeAttrs: true});
let libToTest = require('../lib/index');

let validLanguageVal	 = 'en';
let invalidLanguageVal = 'Swahili';
let validCountryVal = 'CO';
let invalidCountryVal = 'Zambia';
let validCurrencyVal = 'USD';
let invalidCurrencyVal = 'Pounds';
let validHubVal = 'TPA';
let invalidHubVal = 'TPC';
let validCarrierVal = 'FedEx';
let invalidCarrierVal = 'Federal Express';
let exampleXmlString = '<request xsi:type="v4:ConnectProductInfoRequest"><language xsi:type="xsd:string">en</language><items xsi:type="v4:ArrayOfProductInfoDat" soapenc:arrayType="v4:ProductInfoDat[]"><item xsi:type="v4:ProductInfoDat"><productID>testItem</productID><description>Item used for Unit Testing</description><price>9.99</price><itemValuationCurrency>USD</itemValuationCurrency><itemExportHubCountry>US</itemExportHubCountry><countryOfOrigin>US</countryOfOrigin><itemInformation xsi:type="v4:CartonsDat"><l xsi:nil="true"></l><w xsi:nil="true"></w><h xsi:nil="true"></h><wt xsi:nil="true"></wt></itemInformation><productName>Test Item</productName><url>https://www.teststore.com/products/testitem</url><hazFlag>0</hazFlag></item><item xsi:type="v4:ProductInfoDat"><productID>testItem2</productID><description>Item used for Unit Testing</description><price>9.99</price><itemValuationCurrency>USD</itemValuationCurrency><itemExportHubCountry>US</itemExportHubCountry><countryOfOrigin>US</countryOfOrigin><itemInformation xsi:type="v4:CartonsDat"><l xsi:nil="true"></l><w xsi:nil="true"></w><h xsi:nil="true"></h><wt xsi:nil="true"></wt></itemInformation><productName>Test Item</productName><url>https://www.teststore.com/products/testitem2</url><hazFlag>0</hazFlag></item></items></request>'

describe('exportedFunctions', function() {

  describe('#validateLanguage', function() {

    it('should return true for valid language', function() {

      let thisIsValid = libToTest.validateLanguage(validLanguageVal);
      thisIsValid.should.equal(true);

    });

    it('should return false for invalid language', function() {

      let thisIsValid = libToTest.validateLanguage(invalidLanguageVal);
      thisIsValid.should.equal(false);

    });

  });

  describe('#validateCountry', function() {

    it('should return true for valid country', function() {

      let thisIsValid = libToTest.validateCountry(validCountryVal);
      thisIsValid.should.equal(true);

    });

    it('should return false for invalid country', function() {

      let thisIsValid = libToTest.validateCountry(invalidCountryVal);
      thisIsValid.should.equal(false);

    });

  });

  describe('#validateCurrency', function() {

    it('should return true for valid currency', function() {

      let thisIsValid = libToTest.validateCurrency(validCurrencyVal);
      thisIsValid.should.equal(true);

    });

    it('should return false for invalid currency', function() {

      let thisIsValid = libToTest.validateCurrency(invalidCurrencyVal);
      thisIsValid.should.equal(false);

    });

  });

  describe('#getCountryForHub', function() {

    it('should return a country code for a valid hub string', function() {

      let hubCountry = libToTest.getCountryForHub(validHubVal);
      hubCountry.should.equal('US');

    });

    it('should return false for an invalid hub string', function() {

      let hubCountry = libToTest.getCountryForHub(invalidHubVal);
      hubCountry.should.equal(false);

    });

  });

  describe('#getCarrierCode', function() {

    it('should return a carrier code for a valid carrier string', function() {

      let theCarrier = libToTest.getCarrierCode(validCarrierVal);
      theCarrier.should.equal(2);

    });

    it('should return 6 for an invalid carrier string', function() {

      let theCarrier = libToTest.getCarrierCode(invalidCarrierVal);
      theCarrier.should.equal(6);

    });

  });

  describe('#getConstructorArgNames', function() {

    it('should return an array of argument names given an object\'s constructor', function() {

      let cartonConstructorArgNames = libToTest.testFunctions.getConstructorArgNames(libToTest.cartonsDat);
      let expectedArgs = ['lengthIn', 'widthIn', 'heightIn', 'weightLb'];
      cartonConstructorArgNames[0].should.equal(expectedArgs[0]);
      cartonConstructorArgNames[1].should.equal(expectedArgs[1]);
      cartonConstructorArgNames[2].should.equal(expectedArgs[2]);
      cartonConstructorArgNames[3].should.equal(expectedArgs[3]);

    });

    it('should return an empty array if constructor is invalid or not a function', function() {

      let notConstructorArgNames = libToTest.testFunctions.getConstructorArgNames('fancyFeast');
      notConstructorArgNames.should.be.empty;

    });

  });

  describe('#xmlNodeValue', function() {

    it('should return the value of a parsed xml node with node parameters', function(done) {

      Parser.parseString(exampleXmlString, function(error, parsedXml) {

        if (error) {

          done(error);

        }
        else {

          let xmlNodeVal = libToTest.testFunctions.xmlNodeValue(parsedXml.request.language);
          xmlNodeVal.should.equal('en');
          done();

        }

      });

    });

    it('should return the value of a parsed xml node without node parameters', function(done) {

      Parser.parseString(exampleXmlString, function(error, parsedXml) {

        if (error) {

          done(error);

        }
        else {

          let xmlNodeVal = libToTest.testFunctions.xmlNodeValue(parsedXml.request.items.item[0].productID);
          xmlNodeVal.should.equal('testItem');
          done();

        }

      });

    });

    it('should return the argument without changes if the argument is not an object', function() {

      let xmlNodeVal = libToTest.testFunctions.xmlNodeValue('testItem');
      xmlNodeVal.should.equal('testItem');

    });



  });

  describe('#xmlObjectNodeArray', function() {

    it('should return the an array of objects using the class constructor passed to it');

    it('should return an array of generic objects if no class constructor is passed to it');

    it('should return the argument without changes if the argument is not an array');

  });

  describe('#setPropertyIf', function() {

    it('should throw a TypeError if the source is not an object');

    it('should throw a TypeError if the target is not an object');

    it('should throw a TypeError if the property name is not a string');

    it('should call the correct test if passed testVal');

    it('should default to the "exists" test if testVal invalid or not given');

    it('should set the target\'s property to the source\'s value');

    it('should set the target\'s property to the given default value if the source value is not set.');

  });

});
