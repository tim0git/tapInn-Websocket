const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION
});

const { TABLE_CONNECTIONS } = process.env;

exports.handler = async (event, context) => {
  console.log('Event:', event);
  console.log('Context:', context);

  const { connectionId } = event.requestContext;

  const deleteParams = {
    TableName: TABLE_CONNECTIONS,
    Key: {
      connectionId
    }
  };

  try {
    await ddb.delete(deleteParams).promise();
    console.log('Remove connectionId success:', connectionId);
  } catch (error) {
    console.log('Remove connectionId failure:', error);
    return {
      statusCode: 500,
      body: `Failed to disconnect: ${JSON.stringify(error)}`
    };
  }

  return { statusCode: 200, body: 'Disconnected.' };
};
