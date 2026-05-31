const { handleCollection } = require('./_data-store');

exports.handler = async function(event){
  return handleCollection(event, {
    collection: 'records',
    requestKey: 'records',
    responseKey: 'records'
  });
};
