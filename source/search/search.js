/**
 * Live search
 *
 * @class
 * @name ISnew.Search
 */
ISnew.Search = function () {
  var self = this;

  // настройки по-умолчанию
  self._default = {
    settings: {
      searchSelector: 'data-search-field',
      resultPlaceholder: 'data-search-result',
      markerClass: 'ajax_search-marked',
      letters: 3,
      template: 'search-default',
      delay: 300
    }
  };

  //
  self.path = '/search_suggestions';
  self.keyupTimeoutID = '';

  self._init();
}

/**
 * Настройка
 *
 * @param  {object} options конфигурация поиска
 */
ISnew.Search.prototype._init = function () {
  var self = this;

  self.setConfig({});

  self._ui = new ISnew.SearchDOM(self);
};

/**
 * Что-то забираем
 * {
 *   query: string
 *   input: jquery(input)
 * }
 */
ISnew.Search.prototype._get = function (options) {
  var self = this;

  EventBus.publish('before:insales:search');

  clearTimeout(self.keyupTimeoutID);

  if (self._isValid(options.query)) {
    self.data.query = options.query;
    self.keyupTimeoutID = setTimeout(function () {
      $.getJSON(self.path, self.data, function (response) {
        self._update(_.merge(options, response));
      });
    }, self.settings.delay);
  } else {
    self._update(options);
  }
};

ISnew.Search.prototype._update = function (options) {
  var self = this;

  var data = {
    suggestions: self._patch(options),
    action: options
  };

  data.invalid = !self._isValid(options.query);
  data.empty = !_.size(options.suggestions);
  data.letters = self.settings.letters;

  _.unset(data.action, 'suggestions');

  EventBus.publish('update:insales:search', data);
};

/**
 * Обновляем настройки
 */
ISnew.Search.prototype.setConfig = function (settings) {
  var self = this;

  _.merge(self, self._default, { settings: settings });

  self.settings.replacment = '<span class="'+ self.settings.markerClass +'">$1</span>';
}

/**
 * Параметры запросов
 *
 * Тащим поля из настроек магазина и текущей локали
 * account_id: Site.account.id,
 * locale: Site.language.locale,
 * fields: [ 'price_min', 'price_min_available' ],
 * hide_items_out_of_stock: Site.account.hide_items
 */
ISnew.Search.prototype._setData = function (_data) {
  var self = this;

  _.merge(self, { data: _data });
};

/**
 * приводим в общий порядок список поиска
 */
ISnew.Search.prototype._patch = function (options) {
  var self = this;
  var _regExp = new RegExp('('+ Site.RegExp.escape(options.query) +')', 'gi');

  return _.reduce(options.suggestions, function (result, product) {
    var temp = {
      id: product.data,
      url: '/product_by_id/'+ product.data,
      title: product.value,
      markedTitle: product.value.replace(_regExp, self.settings.replacment)
    };

    result.push(_.merge(product, temp));
    return result;
  }, []);
};

ISnew.Search.prototype._isValid = function (query) {
  var self = this;

  return query !== '' && query.length >= self.settings.letters;
};