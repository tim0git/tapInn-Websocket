const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION
});

const { TABLE_ORDERS } = process.env;

exports.handler = async (event, context) => {
  console.log('Event:', event);
  console.log('Context:', context);

  const { venue_id } = JSON.parse(event.body);
  const { connectionId, domainName, stage } = event.requestContext;

  // scan open orders from DB

  const scanParams = {
    TableName: TABLE_ORDERS,
    FilterExpression:
      '(#order_status = :order_accepted OR #order_status = :order_pending) AND #venue_id = :venue_id',
    ExpressionAttributeNames: {
      '#order_status': 'order_status',
      '#venue_id': 'venue_id'
    },
    ExpressionAttributeValues: {
      ':order_accepted': 'accepted',
      ':order_pending': 'pending',
      ':venue_id': venue_id
    }
  };

  let openOrders;

  try {
    openOrders = await ddb.scan(scanParams).promise();
    console.log('Scan open orders success:', openOrders);
  } catch (error) {
    console.log('Scan open orders failure:', error);
  }

  // send message to connectionId

  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `${domainName}/${stage}`
  });

  const postData = JSON.stringify({ openOrders: openOrders.Items });

  try {
    await apigwManagementApi
      .postToConnection({ ConnectionId: connectionId, Data: postData })
      .promise();

    console.log('Post message success:', `${connectionId} - ${postData}`);
  } catch (error) {
    console.log('Post message failure:', error);
    return { statusCode: 500, body: error.stack };
  }

  return { statusCode: 200, body: 'Connected.' };
};
