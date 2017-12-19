'use-strict'
let chai = require('chai')
chai.should()
let ClientSync = require('../lib/index').client
let util = require('util')

let testItem = {
  id: 'testItem',
  description: 'Item used for Unit Testing',
  price: 9.9900,
  currency: 'USD',
  exportHub: 'TPA',
  origin: 'US',
  itemInformation: {
    L: 10.0000,
    W: 10.0000,
    H: 10.0000,
    WT: 1.0000
  },
  optionalArgs: {
    productName: 'Test Item',
    url: 'https://www.teststore.com/products/testitem',
    imageUrl: 'https://www.teststore.com/images/products/testitem.jpg',
    hazFlag: 0,
    eccn: '2C001',
    productType: 'Testing'
  }
}

describe('ClientCallback', function () {
  let clientSync
  beforeEach('init new client', function () {
    clientSync = new ClientSync({
      language: 'En',
      merchantKey: '1234567890qwertyuiopasdfghjklzxcvbnm!@#$%^=*+'
    })
  })

  describe('#language', function () {
    it('should have the value "en" by default', function () {
      clientSync.language.should.equal('en')
    })
    it('can be changed', function () {
      clientSync.language = 'es'
      clientSync.language.should.equal('es')
    })
  })

  describe('#merchantKey', function () {
    it('should not accept keys longer than 64 chars in constructor', function () {
      (function () {
        clientSync = new ClientSync({
          language: 'en',
          merchantKey: '1234567890qwertyuiopasdfghjklzxcvbnm!@#$%^&*+.1234567890qwertyuiopasdfghjklzxcvbnm!@#$%^&*+.'
        })
      }).should.throw(TypeError, 'FECB client constructor requires args.merchantKey to be a string of 64 characters or fewer')
    })
  })

  describe('#productInfo', function () {
    it('requires a valid callback function', function () {
      (function () {
        clientSync.productInfo([])
      }).should.throw(TypeError, 'FECB client.productInfo was passed an invalid callback')
    })

    it('requires callback to have two arguments', function () {
      (function () {
        clientSync.productInfo([], function (error) { })
      }).should.throw(TypeError, 'FECB client.productInfo was passed an invalid callback')
    })

    it('requires the first argument to be an array with a length of one or more', function () {
      (function () {
        clientSync.productInfo([], function (error, result) { })
      }).should.throw(TypeError, 'FECB client.productInfo was passed an invalid array of items')
    })

    it('can connect to fecb api', function (done) {
      let testItems = [testItem]
      clientSync.returnRaw = true
      clientSync.returnSoapHeader = true
// 			console.log(clientSync.merchantKey);
      clientSync.productInfo(testItems, function (error, result) {
// 				console.log(util.inspect(result, {depth: null}));
        if (error) {
          error.message.should.equal('Code 1000 — <p>Invalid Partner Key</p>')
          done()
        } else {
          done(JSON.stringify(result))
        }
      })
    })
  })
})
