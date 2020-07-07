# onTap AWS web sockets

## Routes

**\$connect:**

Connection string:

`wss://<api-address>/Test?venue_id=<string>&table_number=<string>`

Table example:

`wss://supersecretcode.execute-api.eu-west-1.amazonaws.com/Test?venue_id=1&table_number=1`

Dashboard example:

`wss://supersecretcode.execute-api.eu-west-1.amazonaws.com/Test?venue_id=1&table_number=dashboard`

**openorders:**

Request:

```json
{ "action": "openorders", "venue_id": "1" }
```

Response to dashboard:

```json
{
  "openOrders": [
    {
      "order_status": "pending",
      "order_id": "531bcab3-0774-4ec5-800b-4397ff45b7df",
      "order_items": { "13": 4, "18": 5 },
      "venue_id": "1",
      "order_time": 1594050382061,
      "table_number": "1"
    },
    {
      "order_status": "accepted",
      "order_id": "6a7da4f7-a646-46a3-a033-cfb53e69386f",
      "order_items": { "1": 3, "8": 10, "10": 1 },
      "venue_id": "1",
      "order_time": 1594045746753,
      "table_number": "24"
    }
  ]
}
```

**order:**

Request from customer:

```json
{
  "action": "order",
  "venue_id": "1",
  "table_number": "1",
  "order_items": { "13": 4, "18": 5 }
}
```

Response to dashboard:

```json
{
  "order_id": "0bc09aea-f152-4386-b1b0-f741f1e01fff",
  "order_time": 1594120013360,
  "venue_id": "1",
  "table_number": "1",
  "order_status": "pending",
  "order_items": { "13": 4, "18": 5 }
}
```

**acceptorder:**

The `order_status` can accept any `<string>`, however we should keep to _accepted_ or _rejected_.

Request from dashboard:

```json
{
  "action": "acceptorder",
  "order_id": "0bc09aea-f152-4386-b1b0-f741f1e01fff",
  "order_time": 1594120013360,
  "venue_id": "1",
  "table_number": "1",
  "order_status": "accepted"
}
```

Response to customer:

```json
{
  "order_status": "accepted",
  "order_id": "0bc09aea-f152-4386-b1b0-f741f1e01fff",
  "order_items": { "13": 4, "18": 5 },
  "order_time": 1594120013360,
  "venue_id": "1",
  "table_number": "1"
}
```

**completeorder:**

The `order_status` can accept any `<string>`, however we should keep to _completed_.

Request from dashboard:

```json
{
  "action": "completeorder",
  "order_id": "0bc09aea-f152-4386-b1b0-f741f1e01fff",
  "order_time": 1594120013360,
  "venue_id": "1",
  "table_number": "1",
  "order_status": "completed"
}
```

Response to customer:

```json
{
  "order_status": "completed",
  "order_id": "0bc09aea-f152-4386-b1b0-f741f1e01fff",
  "order_items": { "product_name": "carlsberg", "product_price": "3.20" },
  "order_time": 1594120013360,
  "venue_id": "1",
  "table_number": "1"
}
```
