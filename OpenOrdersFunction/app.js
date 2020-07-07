const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION
});

const { TABLE_ORDERS } = process.env;

exports.handler = async (event, context) => {
  // eslint-disable-next-line no-console
  console.log(event, 'this is the event');
  // eslint-disable-next-line no-console
  console.log(context, 'this is the context');

  const { venue_id } = JSON.parse(event.body);
  const { connectionId } = event.requestContext;

  let openOrders;

  try {
    const scanParams = {
      TableName: TABLE_ORDERS,
      FilterExpression:
        '#order_status = :order_accepted AND #order_status = :order_pending AND #venue_id = :venue_id',
      ExpressionAttributeNames: {
        '#order_status': 'order_status',
        '#venue_id': 'venue_id'
      },
      ExpressionAttributeValues: {
        ':order_accepted': 'completed',
        ':order_pending': 'pending',
        ':venue_id': venue_id
      }
    };

    openOrders = await ddb.scan(scanParams).promise();
    // eslint-disable-next-line no-console
    console.log(openOrders, 'Open orders');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error, 'Error reading open orders');
  }

  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`
  });

  const postData = JSON.stringify(openOrders.Items);

  try {
    await apigwManagementApi
      .postToConnection({ ConnectionId: connectionId, Data: postData })
      .promise();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error, 'error sending message');
    return { statusCode: 500, body: error.stack };
  }

  return { statusCode: 200, body: 'Connected.' };
};
