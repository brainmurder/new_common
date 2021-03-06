/**
 * Event bus
 *
 * Шина событий. Построена на $.Callbacks;
 */

/**
 * Класс Шины Событий
 */

// TODO: сделать синглтон
ISnew.EventBus = function () {
  var self = this;

  self.eventsList = {};
  self.logger = new ISnew.EventsLogger();

  return;
};

/**
 * Публикация события с данными
 */
ISnew.EventBus.prototype.publish = function (eventId, data) {
  var self = this;

  self.logger.addListner(eventId);

  return self._selectEvent(eventId).fire(data);
};

/**
 * Подписаться на событие
 */
ISnew.EventBus.prototype.subscribe = function (eventId, callback) {
  var self = this;

  return self._selectEvent(eventId).add(callback);
};

/**
 * Отписаться от события
 */
ISnew.EventBus.prototype.unsubscribe = function (eventId, callback) {
  var self = this;

  return self._selectEvent(eventId).remove(callback);
};

/**
 * Выбор нужного события
 */
ISnew.EventBus.prototype._selectEvent = function (eventId) {
  var self = this;
  var Event;

  eventId = _.toString(eventId);
  Event = self.eventsList[eventId];

  // Если у нас новое событие, создаем его и объявляем в системе.
  if (!Event) {
    // Объявляем методы
    Event = $.Callbacks('memory');
    self.eventsList[eventId] = Event;
  }

  return Event;
};