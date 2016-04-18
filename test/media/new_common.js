/*
 * Инициализация переменных
 */

'use strict';

if (!ISnew) {
  var ISnew = {};
}

// Глобальная информация о сайте.
if (!Site) {
  var Site = {};
}

// Место для всех оберток json
if (!ISnew.json) {
  ISnew.json = {};
}

// Место для всяких утилиток
if (!ISnew.tools) {
  ISnew.tools = {};
}

// Список событий и прикрученных колбеков
if (!EventsList) {
  var EventsList = {};
}

if (!Events) {
  var Events;
}
/**
 * Event bus
 *
 * Шина событий. Построена на $.Callbacks;
 */

Events = function (id) {
  var id = _.toString(id);
  var Event = id && EventsList[id];
  var callbacks;

  // Если у нас новое событие, создаем его и объявляем в системе.
  if (!Event) {
    // Вешаем флаг того, что во вновь подключенные колбеки будет передана инфа
    callbacks = $.Callbacks('memory');

    // Объявляем методы
    Event = {
      publish: callbacks.fire,
      subscribe: callbacks.add,
      unsubscribe: callbacks.remove
    };

    // Объявляем в системе
    if (id) {
      EventsList[id] = Event;
    }
  }

  return Event;
}
/**
 * Cart
 *
 * Зависит от ISnew.json, Events, ISnew.CartHelper
 */

ISnew.Cart = function () {
  var self = this;
  var json = ISnew.json;
  var cart = {};
  var Helper = new ISnew.CartHelper();

  /**
   * Добавить в корзину заданное кол-во товаров
   *
   * на вход - объект. смотреть доку
   */
  self.add = function (task) {
    var current_items = self._getItems();
    task = task || {};
    task.method = 'add_items';

    _.forIn(task.items, function(quantity, variant_id) {
      var current_quantity = current_items[variant_id] + quantity;

      current_items[variant_id] = current_quantity;
    });

    self._update(current_items, task);
  };

  /**
   * Удадить из корзины заданное кол-во товаров
   * на вход - объект с парами variant_id: quantity
   */
  self.remove = function (task) {
    var current_items = self._getItems();
    task = task || {};
    task.method = 'remove_items';

    _.forIn(task.items, function(quantity, variant_id) {
      var current_quantity = current_items[variant_id] - quantity;

      current_items[variant_id] = current_quantity > 0 ? current_quantity : 0;
    });

    self._update(current_items, task);
  };

  /**
   * Устанавливает кол-во товаров в корзине для каждой позиции
   * на вход - объект с парами variant_id: quantity
   */
  self.set = function (task) {
    var current_items = self._getItems();
    task = task || {};
    task.method = 'set_items';

    _.forIn(task.items, function(quantity, variant_id) {
      current_items[variant_id] = quantity;
    });

    self._update(current_items, task);
  };

  /**
   * Удалить позиции из корзины
   * на вход - массив с variant_id
   */
  self.delete = function (task) {
    var current_items = self._getItems();
    task = task || {};
    task.method = 'delete_items';

    _.chain(task.items)
      .toArray()
      .forEach(function(variant_id) {
        current_items[variant_id] = 0;
      })
      .value();

    self._update(current_items, task);
  };

  /**
   * Полностью очистить корзину
   */
  self.clear = function (task) {
    var current_items = self._getItems();
    task = task || {};
    task.method = 'clear_items';

    _.forIn(current_items, function(quantity, variant_id) {
      current_items[variant_id] = 0;
    });

    self._update(current_items, task);
  };

  /**
   * Получить состав корзины
   */
  self.getOrder = function () {
    return cart;
  };

  /**
   * Получить с сервера состав корзины
   */
  self._get = function () {
    // TODO: изменить на нормальныйую логику после нормолизации ответов json
    var task = {
      method: 'init'
    };
    self._update({}, task);
  };

  /**
   * Обновление состава корзины
   */
  self._update = function (items, task) {
    self._before(task);
    json.updateCartItems(items, task.comments)
      .done(function (response) {
        self._setOrder(response, task);
      })
      .fail(function (response) {
        console.log('cart:update:fail', response);
      })
      .always(function () {
        self._always(task);
      });
  };

  /**
  * Разбирает ответы и сохраняет в var cart
  */
  self._setOrder = function (order, task) {
    var data = {};
    cart = Helper.patch(cart, order);

    data = cart;
    data.action = task;

    if (task && task.method) {
      Events(task.method +':insales:cart').publish(data);
    }

    Events('update_items:insales:cart').publish(data);
  };

  /**
   * Событие ПЕРЕД действием
   */
  self._before = function (task) {
    Events('before:insales:cart').publish(task);
  };

  /**
   * Мы закончили что-то делать в корзине
   */
  self._always = function (task) {
    Events('always:insales:cart').publish(task);
  };

  /**
   * Формируем инфу о позициях
   */
  self._getItems = function () {
    var items = {};

    _.forEach(cart.order_lines, function (item) {
      items[item.variant_id] = item.quantity;
    });

    return items;
  };

  self._get();
}
/**
 * Помощник для корзины
 *
 * Важно разобраться с json и как они построены.
 */

ISnew.CartHelper = function () {
  var self = this;
  var order = {};

  /**
   * Основной метод
   */
  self.patch = function (cart, current_order) {
    order = {};

    order.order_lines = current_order.order_lines || current_order.items;
    order.order_line_comments = current_order.order_line_comments || current_order.order.order_line_comments;

    order.positions_count = order.order_lines.length;
    order.items_count = current_order.items_count;
    order.items_price = [];

    order.total_price = current_order.total_price;

    order.discounts = current_order.discounts;

    self._itemsPrice();
    self._deliveryPrice(current_order);
    self._url();
    self._images();

    //console.log('order:', order);
    _.assign(cart, order);

    //console.log('cart:', cart);
    return cart;
  };

  /**
   * Добавляем поле с ценой только товаров, без доставки
   */
  self._itemsPrice = function () {
    var items_price = 0;
    items_price = _.reduce(order.order_lines, function (sum, item) {
      return sum + item.sale_price;
    }, 0);

    order.items_price = items_price;
    return;
  };

  /**
   * Добавляем цену доставки
   * NOTE: в разных json лежит в разных местах
   */
  self._deliveryPrice = function (current_order) {
    var delivery_price = _.toString(current_order.delivery_price) || _.toString(current_order.order.delivery_price);

    order.delivery_price = parseFloat(delivery_price);

    return;
  };

  /**
   * Фиксим url с учетом языков
   */
  self._url = function () {
    _.forEach(order.order_lines, function (item) {
      //console.log(item);
      // TODO: пока хз. нужен язык
    });
    return;
  };

  /**
   * Фиксим картинки товаров
   */
  self._images = function () {
    _.forEach(order.order_lines, function (item) {
      item.images = item.product.images;
    });
    return;
  }
};
/*
 * Добавление товара в корзину
 */

/**
 * Принимаем объект
 *
 * Внезапно, если это объект невалидного вида мы все равно получим ответ!!!
 */

ISnew.json.addCartItems = function (items, comments) {
  var fields = {};

  _.forIn(items, function (quantity, variant_id) {
    fields['variant_ids['+ variant_id +']'] = quantity;
  });

  _.forIn(comments, function (comment, variant_id) {
    fields['cart[order_line_comments]['+ variant_id +']'] = comment;
  });

  return $.post('/cart_items.json', fields);
}
/**
 * Добавление товара в сравнение
 */

ISnew.json.addCompareItem = function (id) {
  var fields = {
    'product[id]': _.toInteger(id)
  };

  return $.post('/compares.json', fields);
}
/*
 * Получение состава корзины
 */

ISnew.json.getCartItems = function () {
  var result = $.Deferred();
  var cookieCart = $.cookie('cart');

  /*
   * В куке состав корзины хранится, если там не более 4х РАЗНЫХ модификаций
   * Кука может быть пустой - дергаем инфу с сервера
   * Если кука содержит строку 'json' - дергаю инфу с сервера
   */
  if (cookieCart && cookieCart != 'json') {
    order = $.parseJSON(cookieCart) || null;
    result.resolve(order);
    // reject??
  } else {
    $.getJSON('/cart_items.json')
      .done(function (order) {
        result.resolve(order);
      })
      .fail(function (response) {
        result.reject(response);
      });
  }

  return result.promise();
};
ISnew.json.getClientInfo = function (){
  return $.getJSON('/client_account/contacts.json');
}
/*
 * Получение информации о коллекции
 */

ISnew.json.getCollection = function () {
  var path = '/collection/'+ _.toString(arguments[0]) +'.json';
  var fields = {};

  _.chain(arguments)
    .drop()
    .compact()
    .each(function (value) {
      _.assign(fields, value)
    })
    .value();

  return $.getJSON(path, fields);
}
/**
 * Добавление товара в сравнение
 */

ISnew.json.getCompareItems = function (id) {

  return $.getJSON('/compares.json');
}
/*
 * Получение информации о товаре
 */

ISnew.json.getProduct = function (id) {
  return $.getJSON('/product_by_id/'+ _.toInteger(id) +'.json');
}
/*
 * Получение информации о списке товаров
 */

ISnew.json.getProductsList = function (id_array) {
  // указваем, сколько id нужно отправить за раз
  var query_limit = 25;

  /**
   * Генерим адреса для запросов
   *
   * Приводим к типу массив (мало ли что там прилетело)
   * Разбиваем на пачки, делаем из них правильные адреса для запросов
   */
  var paths = _.chain(id_array)
    .toArray()
    .compact()
    .chunk(query_limit)
    .map(function (ids_list) {
      return '/products_by_id/'+ ids_list.join() +'.json';
    })
    .value();

  // собираем задачи
  var promises = $.map(paths, function (path) {
    return $.ajax(path).then(function (response) {
        return response;
      });
  });

  /**
   * Склеиваем ответы.
   *
   * Проходимся по всем получившимся промисам, дергаем их
   */
  return $.when.apply(this, promises)
    .then(function () {
      /**
       * Получаем ответы ото ВСЕХ промисов.
       * Приводим к типу массив, на случай если ответы все кривые и там - пустота
       * Вытаскиваем массив с продуктами, склеиваем все массивы и выдаем наружу
       */
      return _.chain(arguments)
        .toArray()
        .map(function (response) {
          return response.products;
        })
        .flatten()
        .union()
        .value()
    });
}
/**
 * Оформление заказа
 */

ISnew.json.makeCheckout = function (client, order) {
  console.log(client, order);
  var dfd = $.Deferred();
  var checkout = {
    pid: 1,
    'order[delivery_variant_id]': _.toInteger(order.delivery),
    'order[payment_gateway_id]': _.toInteger(order.payment)
  };

  _.forIn(client, function (value, field) {
    checkout['client['+ field +']'] = value;
  });

  console.log(checkout);

  $.post('/fast_checkout.json', checkout)
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
}
/*
 * Удаление товара из корзины
 */

ISnew.json.removeCartItem = function (variant_id) {
  var path = '/cart_items/'+ _.toInteger(variant_id) +'.json';
  var fields = {
    '_method': 'delete'
  };

  return $.post(path, fields);
}
/*
 * Удаление товара из сравнения
 */

ISnew.json.removeCompareItem = function (id) {
  var fields = {
      _method: 'delete',
    };
  var path   = '/compares/'+ _.toInteger(id) +'.json';

  return $.post(path, fields);
}
/*
 * Отправление сообщения
 */

ISnew.json.sendMessage = function (input) {
  var result = $.Deferred();
  var message = {};

  _.forIn(input, function (value, key) {
    message['feedback['+ key +']'] = value;
  });

  $.post('/client_account/feedback.json', message)
    .done(function (response) {
      if (message && response.status == 'ok') {
        result.resolve(response);
      } else {
        response.message = message;
        result.reject(response);
      }
    });

  return result.promise();
};
/**
 * Обновление корзины
 */

ISnew.json.updateCartItems = function (items, comments) {
  var fields = {
    '_method': 'put'
  };

  _.forIn(items, function(quantity, variant_id) {
    fields['cart[quantity]['+ variant_id +']'] = quantity;
  });

  _.forIn(comments, function(comment, variant_id) {
    fields['cart[order_line_comments]['+ variant_id +']'] = comment;
  });

  return $.post('/cart_items.json', fields);
}
/**
 * Типы цен
 */
ISnew.ProductPriceType = function (product, _owner) {
  var self = this;
  self._owner = _owner;
  self.variant_id = product.variants[0].id;

  self.price_kinds = self._initPrices(product);

  return self;
};

/**
 * Инициализация
 */
ISnew.ProductPriceType.prototype._initPrices = function (product) {
  var self = this;
  var price_kinds = product.price_kinds;
  var price_types = {};

  _.forEach(product.variants, function (variant) {
    price_types[variant.id] = [];

    price_types[variant.id].push({
      min_quantity: 0,
      price: parseFloat(variant.price)
    });

    _.forEach(variant.prices, function (price, index) {
      price_types[variant.id].push({
        min_quantity: price_kinds[index].value,
        price: parseFloat(variant.prices[index])
      });
    })
  });

  return price_types;
};

/**
 * Обновление после любых действий
 */
ISnew.ProductPriceType.prototype._update = function () {
  var self = this;
  var status = {
    action: 'update_price',
    price: self.getPrice(),
    quantity: self._owner.quantity
  };

  self._owner._updateStatus(status);
  return;
};

/**
 * Получение актуальной цены за штуку
 */
ISnew.ProductPriceType.prototype.getPrice = function () {
  var self = this;
  var price = 0;

  _.forEach(self.price_kinds[self.variant_id], function (price_type) {
    if (self._owner.quantity < price_type.min_quantity) {
      return false;
    }

    price = price_type.price;
  });

  return price;
};

/**
 * Задать актуальное кол-во товара
 */
ISnew.ProductPriceType.prototype.setQuantity = function () {
  var self = this;

  self._update();
  return;
};

/**
 * Выбираем модификацию товара
 */
ISnew.ProductPriceType.prototype.setVariant = function (variant_id) {
  var self = this;
  variant_id = parseInt(variant_id);

  if (self.variant_id == variant_id) {
    return false;
  }

  self.variant_id = variant_id;

  self._update();
  return;
};
/**
 * Product
 */
ISnew.Product = function (product) {
  var self = this;
  self.product = product;

  self.quantity = 0;
  self.price_kinds = new ISnew.ProductPriceType(product, self);
  self.variants = new ISnew.ProductVariants(product, self);
};

/**
 * Обновления состояний товара
 */
ISnew.Product.prototype._updateStatus = function (status) {
  var self = this;

  status.product_id = self.product.id;

  // Если у нас переключался вариант - обновляем тип цен
  if (status.action == 'update_variant') {
    self.price_kinds.setVariant(status.id);
  };

  // Трегирим нужное событие и сбрасываем состояние
  Events(status.action +':insales:product').publish(status);
  return;
};

/**
 * Установка кол-ва товара
 */
ISnew.Product.prototype.setQuantity = function (quantity) {
  var self = this;

  self.quantity = parseFloat(quantity);

  self.price_kinds.setQuantity(self.quantity);
  return;
};
/**
 * Variants tree
 */
ISnew.ProductVariants = function (product, _owner) {
  var self = this;
  self._owner = _owner;

  self.variants = product.variants;
  self.tree = self._initTree(product.variants);
  self.options = self._initOptions(product.option_names);

  self._update();
};

/**
 * Строим дерево вариантов
 */
ISnew.ProductVariants.prototype._initTree = function (variants) {
  var self = this;
  var tree = {};

  // Проходимся по вариантам
  _.forEach(variants, function (variant) {
    var variant_id = variant.id;
    var leaf = tree;

    // Разбираем опции
    _.forEach(variant.option_values, function(option, index) {
      var id;
      var isAvailable;

      // Если дошли до последней опции - выставляем вариант и доступность
      if (index == (variant.option_values.length - 1)) {
        id = variant_id;
        isAvailable = variant.available;
      }

      // Если такую опцию мы еще не вносили - вбиваем все, что есть.
      if (!leaf[option.position]) {
        leaf[_.toInteger(option.position)] = {
          id: _.toInteger(option.id),
          tree: {},
          title: option.title,
          variant_id: id,
          position: _.toInteger(option.position)
        };

        // Выставляем доступность
        if( isAvailable !== undefined ){
          leaf[option.position].available = isAvailable;
        };
      }

      leaf = leaf[option.position].tree;
    });
  });

  _.forEach(tree, function (leaf) {
    self._nodeAvailable(leaf);
  });

  return tree;
};

/**
 * Установка доступности вариантов
 *
 * Если все потомки узла недоступны - узел недоступен
 */
ISnew.ProductVariants.prototype._nodeAvailable = function (leaf) {
  var self = this;

  if (leaf.variant_id === undefined) {
    var isAvailable = false;

    _.forEach(leaf.tree, function (child){
      if (self._nodeAvailable(child)) {
        isAvailable = true;
      };
    });

    leaf.available = isAvailable;
  };

  return leaf.available;
};

/**
 * Обновляем состояние вариантов
 */
ISnew.ProductVariants.prototype._update = function () {
  var self = this;
  var status = self.getVariant();

  status.action = 'update_variant';

  self._owner._updateStatus(status);
  return;
};

/**
 * Получить значения с уровня
 */
ISnew.ProductVariants.prototype.getLevel = function (level) {
  var self = this;
  var leaf = self.tree;

  _.forEach(self.options, function(option, option_level) {
    if (level == option_level) {
      return false;
    }
    leaf = leaf[option.selected].tree;
  });

  return leaf;
};

/**
 * Получить первый элемент на уровне
 */
ISnew.ProductVariants.prototype.getFirst = function (leaf) {
  var self = this;

  var first = _.chain(leaf)
    .toArray()
    .first()
    .value();

  return first;
};

/**
 * Получаем выбранный вариант
 */
ISnew.ProductVariants.prototype.getVariant = function () {
  var self = this;
  var branch = _.get(self, self._getSelectedVector());
  var id;

  id = _.findKey(self.variants, function(variant) {
    return variant.id == branch.variant_id;
  });

  return self.variants[id];
};

/**
 * Устанавливаем вариант
 */
ISnew.ProductVariants.prototype.setVariant = function (variant_id) {
  var self = this;

  self._setOptionByVariant(variant_id);

  self._update();
  return;
};

// ====================================================================================

/**
 * Подготовка опций
 */
ISnew.ProductVariants.prototype._initOptions = function (options) {
  var self = this;
  var leaf = self.tree;

  _.forEach(options, function(option, index) {
    var first = self.getFirst(leaf);

    options[index].selected = first.position;
    leaf = first.tree;
  });

  return options;
};

/**
 * Устанавливаем опцию внешним обработчиком.
 * АХТУНГ!!! Влечет обновление актуального варианта!
 */
ISnew.ProductVariants.prototype.setOption = function (option) {
  var self = this;

  var index = _.findKey(self.options, function (_option) {
    return _option.id == option.option_name_id;
  });

  // Если не опцию не меняли - на выход
  if (self.options[index].selected == option.position) {
    return;
  }

  self.options[index].selected = option.position;

  /**
   * Проходим по выбранным опциям и фиксим неприавльно выбранные.
   * Неправильные - если при текущем варианте мы уходм в лес.
   */
  _.forEach(self.options, function (_option, index) {
    var isLeaf = _.get(self, self._getSelectedVector(index + 1));

    // Если мы не можем найти такую ветку - вытаскиваем строение уровня
    // и помечаем первое свойство как выбранное
    if (isLeaf === undefined) {
      var leaf = self.getLevel(index);
      var first = self.getFirst(leaf);

      _option.selected = first.position;
    }
  });

  self._update();
  return;
};

/**
 * Получить опцию
 */
ISnew.ProductVariants.prototype.getOption = function (index) {
  var self = this;

  return self.options[index].selected;
};

/**
 * Установить опции по варианту
 */
ISnew.ProductVariants.prototype._setOptionByVariant = function (variant_id) {
  var self = this;

  var index = _.findKey(self.variants, function (variant) {
    return variant.id == variant_id;
  });

  _.forEach(self.variants[index].option_values, function(option, option_index) {
    self.options[option_index].selected = option.position;
  });

  return;
};

/**
 * генерим путь по выбранным опциям
 */
ISnew.ProductVariants.prototype._getSelectedVector = function (_length) {
  var self = this;
  var vector = '';
  _length = (_length || self.options.length) - 1;

  _.forEach(self.options, function(option, index) {
    vector += '.tree['+ (option.selected) +']';
    if (_length == index) {
      return false;
    }
  });

  return vector;
};