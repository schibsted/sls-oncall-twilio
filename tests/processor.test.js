const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const twilio = require('twilio');
const processor = require('../processor');
const testEvent = require('./event');

chai.use(chaiAsPromised);
const { assert } = chai;

describe('processor.js', () => {
  it('should throw error when message has invalid signature', () => {
    const r = processor.process({ ...testEvent }, { twilio }, { twilioToken: '123' });
    return assert.isRejected(r, /Invalid signature/);
  });

  it('should throw error when oncallee is missing phone', async () => {
    const listUsersOnCall = sinon.stub().resolves({
      body: JSON.stringify({
        users: [{
          id: '123', name: 'John', email: 'john@doe.org', time_zone: 'Europe/Oslo',
        }],
      }),
    });
    const listContactMethods = sinon.stub().resolves({
      body: JSON.stringify({
        contact_methods: [],
      }),
    });
    const pagerdutyClient = {
      schedules: { listUsersOnCall },
      users: { listContactMethods },
    };

    const r = processor.process(
      { ...testEvent },
      { pagerdutyClient, twilio },
      { twilioToken: 'xyztwiliotokenxyz' },
    );
    return assert.isRejected(r, /Oncallee does not have a phone number/);
  });

  it('should request PagerDuty with schedule', async () => {
    const listUsersOnCall = sinon.stub().resolves({
      body: JSON.stringify({
        users: [{
          id: '123', name: 'John', email: 'john@doe.org', time_zone: 'Europe/Oslo',
        }],
      }),
    });
    const listContactMethods = sinon.stub().resolves({
      body: JSON.stringify({
        contact_methods: [{ type: 'phone_contact_method', country_code: 46, address: '1234' }],
      }),
    });
    const pagerdutyClient = {
      schedules: { listUsersOnCall },
      users: { listContactMethods },
    };

    const response = await processor.process(
      { ...testEvent },
      { pagerdutyClient, twilio },
      { twilioToken: 'xyztwiliotokenxyz' },
    );
    assert.isTrue(listUsersOnCall.calledOnceWith('PCBO9T1'));
    assert.isTrue(listContactMethods.calledOnceWith('123'));

    return assert.equal(response, '<?xml version="1.0" encoding="UTF-8"?><Response><Dial>+461234</Dial></Response>');
  });
});
