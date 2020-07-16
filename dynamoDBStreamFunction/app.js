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

    if (
      record.dynamodb.NewImage.order_status.S === 'completed' ||
      record.dynamodb.NewImage.order_status.S === 'rejected'
    ) {
      try {
        // let fest begins
        let venue_id = parseInt(record.dynamodb.NewImage.venue_id.S);
        let order_items_object = JSON.parse(
          record.dynamodb.NewImage.order_items.S
        );
        let order_time = new Date(
          parseInt(record.dynamodb.NewImage.order_time.N)
        );
        let order_status = record.dynamodb.NewImage.order_status.S;
        let table_number = record.dynamodb.NewImage.table_number.S;
        let menu = await knex('products').select('*').where({ venue_id });
        let lookup = createLookUpObj(menu, 'product_id');
        let item_count = countBasket(order_items_object);
        let order_items = recreateBasket(order_items_object, lookup);
        console.log('menu', menu);
        console.log('lookup', lookup);
        let total_price = calculateTotal(order_items_object, lookup);

        let orderToStore = {
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
            order_id: record.dynamodb.NewImage.order_id.S,
            order_time: record.dynamodb.NewImage.order_time.N
          },
          ConditionExpression: 'order_id = :order_id',
          ExpressionAttributeValues: {
            ':order_id': record.dynamodb.NewImage.order_id.S
          }
        };

        await ddb.delete(deleteParams).promise();
        console.log('Update Postgres success');
      } catch (error) {
        console.log('Update Postgres failure:', error);
      }
    }
  }
  return `Successfully processed ${event.Records.length} records.`;
};
