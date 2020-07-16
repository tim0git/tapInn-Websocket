const AWS = require('aws-sdk');

const {
  createLookUpObj,
  calculateTotal,
  countBasket,
  recreateBasket
} = require('./Dashboard.utils');

const {
  RDS_HOSTNAME,
  RDS_USERNAME,
  RDS_PASSWORD,
  RDS_DB_NAME,
  RDS_PORT,
  AWS_REGION,
  TABLE_ORDERS
} = process.env;

const knex = require('knex')({
  client: 'pg',
  connection: {
    host: RDS_HOSTNAME,
    user: RDS_USERNAME,
    password: RDS_PASSWORD,
    database: RDS_DB_NAME,
    port: RDS_PORT
  }
});

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: AWS_REGION
});

exports.handler = async (event, context) => {
  console.log('Event:', event);
  console.log('Context:', context);

  for (const record of event.Records) {
    console.log('Record:', record);

    if (
      record.dynamodb.NewImage.order_status.S === 'completed' ||
      record.dynamodb.NewImage.order_status.S === 'rejected'
    ) {
      try {
        const venue_id = parseInt(record.dynamodb.NewImage.venue_id.S);
        const order_items_object = JSON.parse(
          record.dynamodb.NewImage.order_items.S
        );
        const order_time = new Date(
          parseInt(record.dynamodb.NewImage.order_time.N)
        );
        const order_status = record.dynamodb.NewImage.order_status.S;
        const table_number = record.dynamodb.NewImage.table_number.S;
        const menu = await knex('products').select('*').where({ venue_id });
        const lookup = createLookUpObj(menu, 'product_id');
        const item_count = countBasket(order_items_object);
        const order_items = recreateBasket(order_items_object, lookup);
        const total_price = calculateTotal(order_items_object, lookup);

        const orderToStore = {
          venue_id,
          order_time,
          order_status,
          table_number,
          order_items,
          total_price,
          item_count
        };

        console.log('Order to store:', orderToStore);

        // let postgresAction = await knex('order_history').insert(orderToStore);
        // console.log('PostgreSQL action:', postgresAction);

        /////////////////////////////////////
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

        openOrders = await ddb.scan(scanParams).promise();
        console.log('Scan open orders success:', openOrders);

        const deleteOrderId = record.dynamodb.NewImage.order_id.S;
        const deleteOrderTime = parseInt(record.dynamodb.NewImage.order_time.N);
        console.log(
          typeof deleteOrderId,
          deleteOrderId,
          typeof deleteOrderTime,
          deleteOrderTime
        );

        const deleteParams = {
          TableName: TABLE_ORDERS,
          Key: record.dynamodb.Keys
          // order_id: deleteOrderId,
          // order_time: deleteOrderTime
        };

        const hope = await ddb.delete(deleteParams).promise();
        console.log('Hope:', hope);
      } catch (error) {
        console.log('Update Postgres failure:', error);
      }
    }
  }
  return `Successfully processed ${event.Records.length} records.`;
};
