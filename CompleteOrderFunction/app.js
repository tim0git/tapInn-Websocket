const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION
});

const { TABLE_CONNECTIONS, TABLE_ORDERS } = process.env;

exports.handler = async (event, context) => {
  console.log('Event:', event);
  console.log('Context:', context);

  const {
    order_id,
    order_time,
    order_status,
    venue_id,
    table_number
  } = JSON.parse(event.body);
  const { domainName, stage } = event.requestContext;

  // update order_status in DB

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
    console.log('Update order_status success:', updatedOrder);
  } catch (error) {
    console.log('Update order_status failure:', error);

    return {
      statusCode: 500,
      body: `Failed to connect: ${JSON.stringify(error)}`
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
      ':table_number': table_number
    }
  };

  let connectionId;

  try {
    const data = await ddb.scan(scanParams).promise();
    connectionId = data.Items[0].connectionId;
    console.log('Scan connectionId success:', connectionId);
  } catch (error) {
    console.log('Scan connectionId failure:', error);
    return { statusCode: 500, body: error.stack };
  }

  // send message to connectionId

  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `${domainName}/${stage}`
  });

  const postData = JSON.stringify(updatedOrder.Attributes);

  try {
    await apigwManagementApi
      .postToConnection({ ConnectionId: connectionId, Data: postData })
      .promise();

    console.log('Post message success:', `${connectionId} - ${postData}`);
  } catch (error) {
    if (error.statusCode === 410) {
      console.log('Post message failure:', error);
      await ddb
        .delete({ TableName: TABLE_CONNECTIONS, Key: { connectionId } })
        .promise();
    } else {
      console.log('Post message failure:', error);
      return { statusCode: 500, body: error.stack };
    }
  }

  return { statusCode: 200, body: 'Complete Order Function Complete' };
};
