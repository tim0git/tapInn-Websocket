const AWS = require('aws-sdk');
const axios = require('axios');
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
    console.log('Record Keys:', record.dynamodb.Keys);
    console.log('Record New Image:', record.dynamodb.NewImage);
    console.log('Record Old Image:', record.dynamodb.OldImage);

    if (
      record.dynamodb.NewImage.order_status.S === 'completed' ||
      record.dynamodb.NewImage.order_status.S === 'rejected'
    ) {
      try {
        // let fest begins
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
        console.log('menu', menu);
        console.log('lookup', lookup);
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

        let postgresAction = await knex('order_history').insert(orderToStore);
        console.log('PostgreSQL action:', postgresAction);
        // let fet ends
        const deleteParams = {
          TableName: TABLE_ORDERS,
          Key: {
            order_id: record.dynamodb.NewImage.order_id,
            order_time: record.dynamodb.NewImage.order_time
          },
          ConditionExpression: 'order_id = :order_id',
          ExpressionAttributeValues: {
            ':order_id': record.dynamodb.NewImage.order_id.S
          }
        };

        ddb.delete(params, function (err, data) {
          if (err) {
            console.error(
              'Unable to delete item. Error JSON:',
              JSON.stringify(err, null, 2)
            );
          } else {
            console.log('DeleteItem succeeded:', JSON.stringify(data, null, 2));
          }
        });
      } catch (error) {
        console.log('Update Postgres failure:', error);
      }
    }
  }
  return `Successfully processed ${event.Records.length} records.`;
};
