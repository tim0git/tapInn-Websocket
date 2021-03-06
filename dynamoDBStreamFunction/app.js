const AWS = require('aws-sdk');

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

const {
  createLookUpObj,
  calculateTotal,
  countBasket,
  recreateBasket
} = require('./Dashboard.utils');

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: AWS_REGION
});

exports.handler = async (event, context) => {
  console.log('Event:', event);
  console.log('Context:', context);

  // eslint-disable-next-line no-restricted-syntax
  for (const record of event.Records) {
    console.log('Record:', record);

    if (
      record.dynamodb.NewImage.order_status.S === 'completed' ||
      record.dynamodb.NewImage.order_status.S === 'rejected'
    ) {
      try {
        const venue_id = parseInt(record.dynamodb.NewImage.venue_id.S, 10);
        const order_items_object = JSON.parse(
          record.dynamodb.NewImage.order_items.S
        );
        const order_time = new Date(
          parseInt(record.dynamodb.NewImage.order_time.N, 10)
        );
        const order_status = record.dynamodb.NewImage.order_status.S;
        const table_number = record.dynamodb.NewImage.table_number.S;
        // eslint-disable-next-line no-await-in-loop
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

        // eslint-disable-next-line no-await-in-loop
        const postgresAction = await knex('order_history').insert(orderToStore);
        console.log('PostgreSQL action:', postgresAction);

        const deleteOrderId = record.dynamodb.NewImage.order_id.S;
        const deleteOrderTime = parseInt(
          record.dynamodb.NewImage.order_time.N,
          10
        );

        const deleteParams = {
          TableName: TABLE_ORDERS,
          Key: {
            order_id: deleteOrderId,
            order_time: deleteOrderTime
          }
        };

        // eslint-disable-next-line no-await-in-loop
        await ddb.delete(deleteParams).promise();
        console.log('Remove order success:', deleteOrderId);
      } catch (error) {
        console.log('Update Postgres failure:', error);
      }
    }
  }
  return `Successfully processed ${event.Records.length} records.`;
};
