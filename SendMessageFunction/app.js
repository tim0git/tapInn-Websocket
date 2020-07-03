// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION
});

const { TABLE_NAME } = process.env;

exports.handler = async (event, context) => {
  let connectionData;

  console.log(event, 'this is the event');
  console.log(context, 'this is the context');
  const { venue_id } = JSON.parse(event.body);
  console.log(venue_id);

  try {
    var params = {
      TableName: TABLE_NAME,
      ProjectionExpression: 'connectionId',
      FilterExpression: '#venue_id = :venue_id',
      ExpressionAttributeNames: {
        '#venue_id': 'venue_id'
      },
      ExpressionAttributeValues: {
        ':venue_id': venue_id
      }
    };

    console.log(params, 'params');
    console.log(typeof venue_id, 'type of venue_id');

    connectionData = await ddb.scan(params).promise();

    console.log(connectionData);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  });

  const postData = JSON.parse(event.body).data;

  const postCalls = connectionData.Items.map(async ({ connectionId }) => {
    try {
      // conditional that only sends to the existing user..
      await apigwManagementApi
        .postToConnection({ ConnectionId: connectionId, Data: postData })
        .promise();
    } catch (e) {
      if (e.statusCode === 410) {
        console.log(`Found stale connection, deleting ${connectionId}`);
        await ddb
          .delete({ TableName: TABLE_NAME, Key: { connectionId } })
          .promise();
      } else {
        throw e;
      }
    }
  });

  try {
    await Promise.all(postCalls);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: 'Data sent.' };
};
