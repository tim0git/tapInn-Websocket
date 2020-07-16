const AWS = require('aws-sdk');
const axios = require('axios');
const {
  createLookUpObj,
  calculateTotal,
  countBasket,
  recreateBasket
} = require('./Dashboard.utils');

const {
  TABLE_ORDERS,
  RDS_HOSTNAME,
  RDS_USERNAME,
  RDS_PASSWORD,
  RDS_DB_NAME,
  RDS_PORT
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
  region: process.env.AWS_REGION
});

exports.handler = async (event, context) => {
  console.log('Event:', event);
  console.log('Context:', context);

  for (const record of event.Records) {
    console.log('Record:', record);

    console.log('Order status:', record.dynamodb.NewImage.order_status.S);
    if (
      record.dynamodb.NewImage.order_status.S === 'completed' ||
      record.dynamodb.NewImage.order_status.S === 'rejected'
    ) {
      try {
        const venue_id = record.dynamodb.NewImage.venue_id.S;
        console.log('venue_id', venue_id);

        const order_items_object = JSON.parse(dynamodb.NewImage.order_items.S);
        console.log(
          'order_items_object:',
          typeof order_items_object,
          order_items_object
        );
        //{"79":3,"80":2}

        const order_time = record.dynamodb.NewImage.order_time.N;
        console.log('order_time:', order_time);

        const order_status = record.dynamodb.NewImage.order_status.S;
        console.log('order_status:', order_status);

        const table_number = record.dynamodb.NewImage.table_number.S;
        console.log('table_number:', table_number);

        const menu = await knex('products').select('*').where({ venue_id });
        console.log('Menu:', menu);

        const lookup = createLookUpObj(menu, 'product_id');
        console.log('Lookup:', typeof lookup);
        console.log(lookup, 'lookup');

        const item_count = countBasket(order_items_object);
        console.log(item_count, 'item object');

        const order_items = recreateBasket(order_items_object, lookup);
        console.log(order_items);

        const total_price = calculateTotal(order_items_object, lookup);
        console.log(total_price);

        // test this up on aws..
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

        // knex('order_history').insert(orderToStore);
        // NewImage: {
        //   order_status: [Object], xx
        //   table_number: [Object],
        //   order_time: [Object], xx
        //   order_id: [Object],
        //   venue_id: [Object], xx
        //   order_items: [Object] xx
        // },

        // const deleteParams = {
        //     TableName:TABLE_ORDERS,
        //     Key:{
        // order_id,
        // order_time
        // },
        //     ConditionExpression:"order_id <= :order_id",
        //     ExpressionAttributeValues: {
        //         ":order_id": order_id
        //     }
        // };
        // ddb.delete(deleteParams)
      } catch (error) {
        console.log('Update Postgres failure:', error);
      }
    }
  }
  return `Successfully processed ${event.Records.length} records.`;
};
