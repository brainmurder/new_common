/**
 * Менеджер задач для корзины
 * Занимается контролем за задачами, склейкой и отправкой
 */
ISnew.CartTasks = function (_owner) {
  var self = this;

  self._owner = _owner;

  self._lock = false;

  self._taskToWork = [];
  self._taskInWork = [];

  self._init();
};

ISnew.CartTasks.prototype._init = function () {
  var self = this;
  var _atStore = localStorage.getItem('cart');

  _atStore = JSON.parse(_atStore);
  if (_atStore && (_.now() - _atStore.addedAt) < 30000) {
    self._owner.order.set(_atStore);
  }
};

/**
 * Точка входа
 *
 * Если параметр передан, то добавляем таску в очередь.
 *
 * Если нет - пинаем оставшуюся очередь, может прилететь только от CART()!!!
 * После получения ответа от сервера.
 */
ISnew.CartTasks.prototype.send = function (task) {
  var self = this;


  if (task) {
    self._add(task);
  } else {
    self._push();
  }

  return;
};

/**
 * Добавляем таску в очередь
 */
ISnew.CartTasks.prototype._add = function (task) {
  var self = this;

  self._taskToWork.push(task);

  self._push();
  return;
};

/**
 * Пушим очередь на сервер
 */
ISnew.CartTasks.prototype._push = function () {
  var self = this;
  var tasks = self._taskToWork;
  var items_set = self._owner.order.getItems();
  var result_task = {
    comments: self._owner.order.getComments()
  };

  // если залокано запросом - посылаем в утиль
  if (self._lock || tasks.length == 0) {
    return false;
  }

  // не залочен? решаем этот вопрос )
  self._lock = true;

  // перебрасываем накопившиеся таски в обработку
  self._taskInWork = self._taskToWork;
  self._taskToWork = [];

  // проходим по таскам
  _.forEach(self._taskInWork, function(task) {
    // применяем таски на актуальный состав
    items_set = self._task(task, items_set);

    // комбайним комменты и купоны
    _.assign(result_task.comments, task.comments);
    result_task.coupon = task.coupon;
  }, items_set);

  self._send(items_set, result_task);
  return;
};

/**
 * Отсылаем на сервак
 */
ISnew.CartTasks.prototype._send = function (items_set, task) {
  var self = this;

  self._owner._update(items_set, task);
  return;
};

/**
 * Применяем таски на местность
 */
ISnew.CartTasks.prototype._task = function (task, current_items) {
  var self = this;
  var method = '_'+ task.method;

  // если такого метода нет - тягаем обновление корзины.
  if (!_.isFunction(self._owner[method])) {
    method = '_get';
  }

  return self._owner[method](task, current_items);
};

/**
 * Действия при успешном обновлении
 */
ISnew.CartTasks.prototype._done = function (order) {
  var self = this;
  var data = {};

  // ставим актуальные данные в корзину
  self._owner.order.set(order);

  order.addedAt = _.now();
  localStorage.setItem('cart', JSON.stringify(order));

  data = _.clone(self._owner.order.get());

  _.forEach(self._taskInWork, function (task) {
    data.action = task || {};
    EventBus.publish(task.method +':insales:cart', data);
  });

  EventBus.publish('update_items:insales:cart', data);
  return;
};

/**
 * Действия при фейле
 */
ISnew.CartTasks.prototype._fail = function (response) {
  var self = this;

  // если не прокатило - заливаем обратно таски
  if (self._taskInWork.length != 0) {
    _.concat(self._taskToWork, self._taskInWork);
  }

  return;
};

/**
 * Действия "всегда"
 */
ISnew.CartTasks.prototype._always = function () {
  var self = this;
  var data = {};

  // снимаем лок
  self._lock = false;

  _.forEach(self._taskInWork, function (task) {
    data.action = task || {};
    EventBus.publish('always:insales:cart', data);
  });

  // всё ок, удаляем задачи
  self._taskInWork = [];

  // погнали все кругом
  self.send();
  return;
};

ISnew.CartTasks.prototype._before = function () {
  var self = this;
  var data = {};

  _.forEach(self._taskInWork, function (task) {
    data.action = task || {};
    if (task.method != 'init') {
      EventBus.publish('before:insales:cart', data);
    }
  });
  return;
};