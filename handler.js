const PD = require('node-pagerduty');
const twilio = require('twilio');
const processor = require('./processor');

const pagerdutyClient = new PD(process.env.PD_TOKEN);
const twilioToken = process.env.TWILIO_TOKEN;

module.exports.handler = async (event) => {
  console.log('Received request', event);

  try {
    const response = await processor.process(event, { pagerdutyClient, twilio }, { twilioToken });
    return { statusCode: 200, headers: { 'Content-Type': 'text/xml' }, body: response };
  } catch (e) {
    console.log(e.message);
    return { statusCode: 400, headers: { 'Content-Type': 'text/plain' }, body: e.message };
  }
};
