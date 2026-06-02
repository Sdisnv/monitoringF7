const { handleCollection } = require('./_data-store');

exports.handler = async function(event){
  return handleCollection(event, {
    collection: 'objectives',
    requestKey: 'objectives',
    responseKey: 'objectives',
    objectPayload: true
  });
};
