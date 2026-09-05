const { handleCollection } = require('../lib/_data-store');

exports.handler = async function(event){
  return handleCollection(event, {
    collection: 'imported-events',
    requestKey: 'importedEvents',
    responseKey: 'importedEvents'
  });
};
