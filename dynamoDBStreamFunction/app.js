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

        const order_items = record.dynamodb.NewImage.order_items.S;
        console.log('order_items:', order_items);
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
        console.log(lookup);

        const total = calculateTotal(order_items, lookup);
        console.log(total);

        const count = countBasket(order_items);
        console.log(count);

        const stringBasket = recreateBasket(order_items, lookup);
        console.log(stringBasket);

        const orderToStore = {
          venue_id,
          order_time,
                };

        // connect to SQL Menu and retrieve by venue_id

        // match up order_items with the menu to create an []?

        // **write order to table**
        // If write is sucessful delete order from Dynamo DB
        // venue_id xx
        // order_time xx
        // order_status xx
        // order_items xx
        // order_price
        // knex('order_history').insert(orders);

        // NewImage: {
        //   order_status: [Object], xx
        //   table_number: [Object],
        //   order_time: [Object], xx
        //   order_id: [Object],
        //   venue_id: [Object], xx
        //   order_items: [Object] xx
        // },

        console.log('inside the if statement');

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
