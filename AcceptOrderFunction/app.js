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

  const {
    order_id,
    order_time,
    order_status,
    venue_id,
    table_number
  } = JSON.parse(event.body);

  const updateParams = {
    TableName: TABLE_ORDERS,
    Key: {
      order_id,
      order_time
    },
    UpdateExpression: 'set order_status = :order_status',
    ExpressionAttributeValues: {
      ':order_status': order_status
    },
    ReturnValues: 'ALL_NEW'
  };

  let updatedOrder;

  try {
    updatedOrder = await ddb.update(updateParams).promise();
    // eslint-disable-next-line no-console
    console.log(updatedOrder, 'successfully updated DB');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(err, 'failed update DB');
    return {
      statusCode: 500,
      body: `Failed to connect: ${JSON.stringify(err)}`
    };
  }

  let connectionData;

  try {
    const params = {
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
        ':table_number': table_number
      }
    };

    connectionData = await ddb.scan(params).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  // eslint-disable-next-line no-console
  console.log(connectionData, 'Connection to send update status message');

  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`
  });

  const postData = JSON.stringify(updatedOrder);

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
    const messageSuccess = await Promise.all(postCalls);
    // eslint-disable-next-line no-console
    console.log(messageSuccess, 'Message success');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e, 'error sending message');
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: 'Data sent.' };
};
