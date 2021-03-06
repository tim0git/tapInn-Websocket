/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
const createLookUpObj = (menuArray, key) => {
  const refObj = {};
  for (const i in menuArray) {
    const value = menuArray[i][key];
    refObj[value] = {
      product_price: menuArray[i].product_price,
      product_name: menuArray[i].product_name
    };
  }

  return refObj;
};

const calculateTotal = (basket, lookup) => {
  let total = 0;
  const items = Object.keys(basket);
  items.forEach(basketItem => {
    total += lookup[basketItem].product_price * basket[basketItem];
  });
  const returnVal = total.toFixed(2);
  return parseFloat(returnVal);
};

const countBasket = basket => {
  let acc = 0;
  for (const i in basket) {
    acc += basket[i];
  }
  return acc;
};

const recreateBasket = (basket, lookup) => {
  const orders = {};

  const items = Object.entries(basket);
  items.forEach(([product_id, count]) => {
    orders[lookup[product_id].product_name] = count;
  });
  return JSON.stringify(orders);
};

module.exports = {
  countBasket,
  calculateTotal,
  createLookUpObj,
  recreateBasket
};

// Basket ->  {"69": 2}
// lookup -> {  '69': { product_price: '3.20', product_name: 'Kirkstall Pale Ale' }}
