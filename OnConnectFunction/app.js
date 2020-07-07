const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION
});

const { TABLE_CONNECTIONS } = process.env;

exports.handler = async (event, context) => {
  console.log('Event:', event);
  console.log('Context:', context);

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
    console.log('Update connectionId success:', connectionId);
  } catch (error) {
    console.log('Update connectionId failure:', error);
    return {
      statusCode: 500,
      body: `Failed to connect: ${JSON.stringify(error)}`
    };
  }

  return { statusCode: 200, body: 'Order complete.' };
};
