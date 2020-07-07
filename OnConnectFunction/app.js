const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION
});

const { TABLE_CONNECTIONS } = process.env;

exports.handler = async (event, context) => {
  // eslint-disable-next-line no-console
  console.log(event, 'this is the event');
  // eslint-disable-next-line no-console
  console.log(context, 'this is the context');

  const { venue_id, table_number } = event.queryStringParameters;
  const { connectionId } = event.requestContext;

  const putParams = {
    TableName: TABLE_CONNECTIONS,
    Item: {
      connectionId,
      venue_id,
      table_number
    }
  };

  try {
    await ddb.put(putParams).promise();
  } catch (err) {
    return {
      statusCode: 500,
      body: `Failed to connect: ${JSON.stringify(err)}`
    };
  }

  return { statusCode: 200, body: 'Connected.' };
};
