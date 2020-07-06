const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION
});

const { TABLE_CONNECTIONS, TABLE_ORDERS } = process.env;

exports.handler = async (event, context) => {
  // eslint-disable-next-line no-console
  console.log(event, 'this is the event');
  // eslint-disable-next-line no-console
  console.log(context, 'this is the context');

  const { requestTimeEpoch } = event.requestContext;
  const { awsRequestId } = context;
  const { venue_id, table_number, order_items } = JSON.parse(event.body);

  const putParams = {
    TableName: TABLE_ORDERS,
    Item: {
      order_id: awsRequestId,
      order_time: requestTimeEpoch,
      venue_id,
      table_number,
      order_status: 'pending',
      order_items
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

  let connectionData;

  try {
    const scanParams = {
      TableName: TABLE_CONNECTIONS,
      ProjectionExpression: 'connectionId',
      FilterExpression:
        '#venue_id = :venue_id and #table_number = :table_number',
      ExpressionAttributeNames: {
        '#venue_id': 'venue_id',
        '#table_number': 'table_number'
      },
      ExpressionAttributeValues: {
        ':venue_id': venue_id,
        ':table_number': 'dashboard'
      }
    };

    connectionData = await ddb.scan(scanParams).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`
  });

  const postData = putParams.Item;

  const postCalls = connectionData.Items.map(async ({ connectionId }) => {
    try {
      // conditional that only sends to the existing user..
      await apigwManagementApi
        .postToConnection({ ConnectionId: connectionId, Data: postData })
        .promise();
    } catch (e) {
      if (e.statusCode === 410) {
        // eslint-disable-next-line no-console
        console.log(`Found stale connection, deleting ${connectionId}`);
        await ddb
          .delete({ TableName: TABLE_CONNECTIONS, Key: { connectionId } })
          .promise();
      } else {
        throw e;
      }
    }
  });

  try {
    const messageSent = await Promise.all(postCalls);
    // eslint-disable-next-line no-console
    console.log(messageSent, 'success');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e, 'error');
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: 'Data sent.' };
};
