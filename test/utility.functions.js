'use-strict';
let chai = require('chai');
chai.should();
// let should = require('should');
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
let exampleXmlString = '<request xsi:type="v4:ConnectProductInfoRequest"><language xsi:type="xsd:string">en</language><items xsi:type="v4:ArrayOfProductInfoDat" soapenc:arrayType="v4:ProductInfoDat[]"><item xsi:type="v4:ProductInfoDat"><productID>testItem</productID><description>Item used for Unit Testing</description><price>9.99</price><itemValuationCurrency>USD</itemValuationCurrency><exportHub>TPA</exportHub><countryOfOrigin>US</countryOfOrigin><itemInformation xsi:type="v4:CartonsDat"><l xsi:nil="true"></l><w xsi:nil="true"></w><h xsi:nil="true"></h><wt xsi:nil="true"></wt></itemInformation><productName>Test Item</productName><url>https://www.teststore.com/products/testitem</url><hazFlag>0</hazFlag></item><item xsi:type="v4:ProductInfoDat"><productID>testItem2</productID><description>Item used for Unit Testing</description><price>9.99</price><itemValuationCurrency>USD</itemValuationCurrency><exportHub>TPA</exportHub><countryOfOrigin>US</countryOfOrigin><itemInformation xsi:type="v4:CartonsDat"><l xsi:nil="true"></l><w xsi:nil="true"></w><h xsi:nil="true"></h><wt xsi:nil="true"></wt></itemInformation><productName>Test Item</productName><url>https://www.teststore.com/products/testitem2</url><hazFlag>0</hazFlag></item></items></request>';
let exampleXmlString2 = '<response xsi:type="v4:ConnectSkuStatusResponse"><error xsi:type="xsd:int">0</error><errorMessage xsi:type="xsd:string" /><items xsi:type="v4:ArrayOfSkuStatusDat"><item xsi:type="SkuStatusDat"><productID xsi:type="xsd:string">testItem</productID><skuHsCode xsi:type="xsd:int">444</skuHsCode><productStatus xsi:type="xsd:int">0</productStatus></item><item xsi:type="SkuStatusDat"><productID xsi:type="xsd:string">testItem2</productID><skuHsCode xsi:type="xsd:int">555</skuHsCode><productStatus xsi:type="xsd:int">1</productStatus></item></items></response>';
let testSourceObject = {
  a: 'apple',
  b: true,
  c: 'USD',
  d: 14.0100,
  e: 0
};
let testTargetObject = {};
let testSetPropertyMap = {
  a: 'string',
  b: 'boolean',
  c: 'validCurrency',
  d: 'float4',
  e: 'int',
  f: 'csvStringCountry'
};

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

    it('should return the an array of objects using the class constructor passed to it', function(done) {

      Parser.parseString(exampleXmlString2, function(error, parsedXml) {

        if (error) {

          done(error);

        }
        else {

          let xmlArrayVal = libToTest.testFunctions.xmlObjectNodeArray(parsedXml.response.items.item, libToTest.testClasses.SkuStatusDat);
          xmlArrayVal.should.be.an('array');
          xmlArrayVal.length.should.equal(2);
          xmlArrayVal[0].should.be.an.instanceof(libToTest.testClasses.SkuStatusDat);
          xmlArrayVal[1].should.be.an.instanceof(libToTest.testClasses.SkuStatusDat);
          done();
        }

      });

    });

    it('should return an array of generic objects if no class constructor is passed to it', function(done) {

      Parser.parseString(exampleXmlString2, function(error, parsedXml) {

        if (error) {

          done(error);

        }
        else {

          let xmlArrayVal = libToTest.testFunctions.xmlObjectNodeArray(parsedXml.response.items.item);
          xmlArrayVal.should.be.an('array');
          xmlArrayVal.length.should.equal(2);
          xmlArrayVal[0].should.not.be.an.instanceof(libToTest.testClasses.SkuStatusDat);
          xmlArrayVal[1].should.not.be.an.instanceof(libToTest.testClasses.SkuStatusDat);
          done();
        }

      });

    });

    it('should return the argument without changes if the argument is not an array', function(done) {

      Parser.parseString(exampleXmlString2, function(error, parsedXml) {

        if (error) {

          done(error);

        }
        else {

          let xmlArrayVal = libToTest.testFunctions.xmlObjectNodeArray(parsedXml.response);
          xmlArrayVal.should.equal(parsedXml.response);
          xmlArrayVal.should.be.an('object');
          xmlArrayVal.should.not.be.an('array');
          done();
        }

      });

    });

  });

  describe('#setPropertyIf', function() {

    it('should throw a TypeError if the source is not an object', function() {

      libToTest.testFunctions.setPropertyIf.bind('testSourceObject', testTargetObject, 'a', testSetPropertyMap.a).should.throw(TypeError, 'invalid');

    });

    it('should throw a TypeError if the target is not an object', function() {

      libToTest.testFunctions.setPropertyIf.bind(testSourceObject, 'testTargetObject', 'a', testSetPropertyMap.a).should.throw(TypeError, 'invalid');

    });

    it('should throw a TypeError if the property name is not a string', function() {

      libToTest.testFunctions.setPropertyIf.bind(testSourceObject, testTargetObject, 0, testSetPropertyMap.a).should.throw(TypeError, 'invalid');

    });

    it('should call the correct test if passed testVal', function() {

      libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, 'a', testSetPropertyMap.a).should.equal('apple');
      libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, 'a', testSetPropertyMap.e).should.equal(false);
      libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, 'b', testSetPropertyMap.b).should.equal(true);
      libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, 'b', testSetPropertyMap.e).should.equal(false);
      libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, 'c', testSetPropertyMap.c).should.equal('USD');
      libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, 'c', testSetPropertyMap.e).should.equal(false);
      libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, 'd', testSetPropertyMap.d).should.equal((14.0100).toFixed(4));
      libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, 'd', testSetPropertyMap.a).should.equal(false);
      libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, 'e', testSetPropertyMap.e).should.equal(0);
      libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, 'e', testSetPropertyMap.a).should.equal(false);

    });

    it('should default to the "exists" test if testVal invalid or not given', function() {

      libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, 'a').should.equal('apple');
      libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, 'f').should.equal(false);

    });

    it('should set the target\'s property to the source\'s value', function() {

      for (propName in testSetPropertyMap) {

        if (testSetPropertyMap.hasOwnProperty(propName)) {

          libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, propName, testSetPropertyMap[propName]);

        }

      }
      testTargetObject.a.should.equal(testSourceObject.a);
      testTargetObject.b.should.equal(testSourceObject.b);
      testTargetObject.c.should.equal(testSourceObject.c);
      testTargetObject.d.should.equal(testSourceObject.d.toFixed(4));
      testTargetObject.e.should.equal(testSourceObject.e);
      (typeof testTargetObject.f).should.be.equal('undefined');

    });

    it('should set the target\'s property to the given default value if the source value is not set.', function() {

      delete testSourceObject.a;
      let testDefault = 'US,DE';
      for (propName in testSetPropertyMap) {

        if (testSetPropertyMap.hasOwnProperty(propName)) {

          libToTest.testFunctions.setPropertyIf(testSourceObject, testTargetObject, propName, testSetPropertyMap[propName], testDefault);

        }

      }
      console.log(testTargetObject);
      testTargetObject.a.should.equal(testDefault);
      testTargetObject.b.should.equal(testSourceObject.b);
      testTargetObject.c.should.equal(testSourceObject.c);
      testTargetObject.d.should.equal(testSourceObject.d.toFixed(4));
      testTargetObject.e.should.equal(testSourceObject.e);
      testTargetObject.f.should.equal(testDefault);

    });

  });

});
