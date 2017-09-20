'use-strict'
let chai = require('chai');
chai.should();
let ClientSync = require('../lib/index').client;
describe('ClientSync', function() {

	let clientSync;
	beforeEach('init new client', function() {
	
		clientSync = new ClientSync({
			language: 'En',
			merchantKey: '1234567890qwertyuiopasdfghjklzxcvbnm!@#$%^&*+'
		});
	
	});
	
	describe('#language', function() {
	
		it('should have the value "en" by default', function() {
		
			clientSync.language.should.equal('en');
		
		});
		it('can be changed', function() {
		
			clientSync.language = 'es';
			clientSync.language.should.equal('es');
		
		});
	
	});
	
});
