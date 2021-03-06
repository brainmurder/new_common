/**
 * Класс Хранилища json Товаров
 * управляет всем процессом получения и хранения json'ов
 */
ISnew.ProductsStorage = function (_owner) {
  var self = this;

  self._settings = {
    maxProducts: 100,
    json: 'products',
    liveTime: 300000 // milisec
  };

  self._owner = _owner;
  self._storage = localStorage;

  // объект для хранения json
  self._json = {};

  self._init();
}

/**
 * Инициализация
 */
ISnew.ProductsStorage.prototype._init = function () {
  var self = this;

  // грузим сохраненные товары
  self._json = self._loadJSON();

  self._checkAlive();
};

/**
 * Отдаем json'ы товаров и хранилища
 */
ISnew.ProductsStorage.prototype.getProducts = function (_idList) {
  var self = this;
  var result = $.Deferred();

  // проверим, про какие товары мы ничего не знаеи?
  var diffId = _.differenceBy(_idList, _.keys(self._json), _.toInteger);

  if (diffId.length) {
    // если про что-то не знаем - тащим всю портянку
    ISnew.json.getProductsList(diffId)
      .done(function (_JSONs) {
        // обрабатываем ответы
        self._updateJSON(_JSONs);

        // отдаем результат
        result.resolve(_.pick(self._json, _idList));
      });
  } else {
    // всё есть - отдаем информацию
    result.resolve(_.pick(self._json, _idList));
  }

  return result.promise();
};

/**
 * Получение сохраненных товаров
 */
ISnew.ProductsStorage.prototype._loadJSON = function () {
  var self = this;
  var _json = self._storage.getItem(self._settings.json);

  _json = JSON.parse(_json) || {};

  return _json;
};

/**
 * Сохранение товаров
 */
ISnew.ProductsStorage.prototype._saveJSON = function () {
  var self = this;
  var _json = JSON.stringify(self._json);

  self._storage.setItem(self._settings.json, _json);

  return;
};

/**
 * Обновление базы )
 */
ISnew.ProductsStorage.prototype._updateJSON = function (_JSONs) {
  var self = this;

  // Добавляем записи
  _.forEach(_JSONs, function (_json) {
    _json.updatedAt = _.now();
    self._json[_json.id] = _json;
  });

  // сохранаяем все добро
  self._saveJSON();

  return;
};

/**
 * Проверяем актуальность записей
 */
ISnew.ProductsStorage.prototype._checkAlive = function () {
  var self = this;
  var currentMoment = _.now();

  _.forEach(self._json, function(_json, key) {
    var _isValid = (currentMoment - _json.updatedAt) < self._settings.liveTime;
    if (!_isValid) {
      _.unset(self._json, key);
    };
  });
};