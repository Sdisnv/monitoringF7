const { handleCollection } = require('../lib/_data-store');

exports.handler = async function(event){
  return handleCollection(event, {
    collection: 'reference-periods',
    requestKey: 'referencePeriods',
    responseKey: 'referencePeriods'
  });
};
