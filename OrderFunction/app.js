const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION
});

const { TABLE_CONNECTIONS, TABLE_ORDERS } = process.env;

exports.handler = async (event, context) => {
  console.log('Event:', event);
  console.log('Context:', context);

  const { requestTimeEpoch, domainName, stage } = event.requestContext;
  const { awsRequestId } = context;
  const { venue_id, table_number, order_items } = JSON.parse(event.body);

  // update orders in DB

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
    console.log('Update orders success:', awsRequestId);
  } catch (err) {
    console.log('Update orders failure:', awsRequestId);
    return {
      statusCode: 500,
      body: `Failed to connect: ${JSON.stringify(err)}`
    };
  }

  // scan connectionId from DB

  const scanParams = {
    TableName: TABLE_CONNECTIONS,
    ProjectionExpression: 'connectionId',
    FilterExpression: '#venue_id = :venue_id and #table_number = :table_number',
    ExpressionAttributeNames: {
      '#venue_id': 'venue_id',
      '#table_number': 'table_number'
    },
    ExpressionAttributeValues: {
      ':venue_id': venue_id,
      ':table_number': 'dashboard'
    }
  };

  let connectionIdArr;

  try {
    connectionIdArr = await ddb.scan(scanParams).promise();
    console.log('Scan connectionId success:', connectionIdArr);
  } catch (error) {
    console.log('Scan connectionId failure:', error);
    return { statusCode: 500, body: error.stack };
  }

  // send message to connectionId

  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `${domainName}/${stage}`
  });

  const postData = JSON.stringify(putParams.Item);

  const postCalls = connectionIdArr.Items.map(async ({ connectionId }) => {
    try {
      await apigwManagementApi
        .postToConnection({ ConnectionId: connectionId, Data: postData })
        .promise();
    } catch (error) {
      console.log('Post message failure:', error);

      if (error.statusCode === 410) {
        await ddb
          .delete({ TableName: TABLE_CONNECTIONS, Key: { connectionId } })
          .promise();
      } else {
        throw error;
      }
    }
  });

  try {
    const messageSent = await Promise.all(postCalls);

    console.log('Post message success:', messageSent);
  } catch (error) {
    console.log('Post message failure:', error);
    return { statusCode: 500, body: error.stack };
  }

  return { statusCode: 200, body: 'Data sent.' };
};
