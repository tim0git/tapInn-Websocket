const AWS = require('aws-sdk');
const axios = require('axios');

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

  const search = await knex('trace').select('*');
  console.log('Dubious Search', search);

  for (const record of event.Records) {
    console.log('Record:', record);

    console.log('Order status:', record.dynamodb.NewImage.order_status.S);
    if (
      record.dynamodb.NewImage.order_status.S === 'completed' ||
      record.dynamodb.NewImage.order_status.S === 'rejected'
    ) {
      try {
        console.log('inside the if statement');
        // const response = await axios.get(
        //   'Ontap-env.eba-rsfhkrz6.eu-west-1.elasticbeanstalk.com/api/products?venue_id=1'
        // );
        // log to send to aws..
        console.log(response);
        console.log(response.data);
        // write order to table
        // If write is sucessful delete order from Dynamo DB
        // venue_id
        // order_time
        // order_status
        // order_items
        // order_price
        // knex('order_history').insert(orders);

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

// loop through reocrds
// if record.status === completed or rejected
// insert in Postgres
// delete from dynamoDB
