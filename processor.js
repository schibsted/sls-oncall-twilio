const qs = require('querystring');

const getOncallForSchedule = async (id, pd) => {
  const userOnCall = await pd.schedules.listUsersOnCall(id, {
    time_zone: 'UTC',
    since: new Date().toISOString(),
    until: new Date(Date.now() + 1000).toISOString(),
  });
  const user = JSON.parse(userOnCall.body).users.pop();

  const contactMethods = await pd.users.listContactMethods(user.id);
  const userDetails = JSON.parse(contactMethods.body);
  const contact = userDetails.contact_methods.find((e) => e.type === 'phone_contact_method');

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: contact ? `+${contact.country_code}${contact.address}` : null,
    time_zone: user.time_zone,
  };
};

module.exports.process = async (event, di, config) => {
  const { 'X-Forwarded-Proto': proto, 'X-Twilio-Signature': sign } = event.headers;
  const { path, domainName } = event.requestContext;
  const url = `${proto}://${domainName}${path}`;

  if (!di.twilio.validateRequest(config.twilioToken, sign, url, qs.parse(event.body))) {
    throw new Error('Invalid signature');
  }

  const { schedule } = event.pathParameters;
  const oncallee = await getOncallForSchedule(schedule, di.pagerdutyClient);
  if (!oncallee.phone) {
    throw new Error('Oncallee does not have a phone number');
  }
  const vr = new di.twilio.twiml.VoiceResponse();
  return vr.dial(oncallee.phone).toString();
};
