/**
 * Оформление заказа
 */

ISnew.json.makeQuickCheckout = function (client) {
  var dfd = $.Deferred();
  var checkout = {}

  _.forIn(client, function (value, field) {
    checkout['client['+ field +']'] = value;
  });

  console.log(checkout);

  $.post('/orders/create_with_quick_checkout.json', checkout)
    .done(function (response) {
      if (response.status == 'ok') {
        dfd.resolve(response);
      } else {
        dfd.reject(response);
      }
    })
    .fail(function (response) {
      dfd.reject(response)
    })

  return dfd.promise();
};