/**
 * CuickCheckout
 */
var $ = require('jquery');
var _ = require('lodash');

var ajax = require('../json/ajax.checkout');
var EventBus = require('../events/events');

var CartQuickCheckout = function (_owner) {
  var self = this;

  self._owner = _owner;

  self.selectors = {
    disabled: 'disabled',

    open: 'data-quick-checkout',

    sendButton: '.m-modal-button--checkout',
    closeButton: '.m-modal-close',
    errors: '.m-modal-errors',
    form: '#quick_checkout_form',
    modal: '.m-modal--checkout',
    msgModal: '#insales-quick-checkout-msg',
  };

  self._init();

  return;
};

CartQuickCheckout.prototype._init = function () {
  var self = this;

  self._bindOpenModal();

  $(function () {
    self.$modal = $(self.selectors.modal);
    self.$message = $(self.msgModal);
    if (self.$modal.length && !self.$message.length) {
      self.$message = $('<div id="insales-quick-checkout-msg" class="m-modal m-modal--msg">\n<div class="m-modal-wrapper">\n<button class="button m-button m-modal-close" data-modal="close"></button>\n<div class="m-modal-msg center"></div>\n</div>\n</div>');
      self.$message.appendTo($('body'));
    }

    self.$send = $(self.selectors.sendButton);
    self.$errors = $(self.selectors.errors);
    self.$overlay = $('<div class="m-overlay" />');
    self.$form = $(self.selectors.form);
    self.$close = $(self.selectors.closeButton);

    self._bindCloseModal();
    self._bindSend();
  });

  self._bindEvents();

  return;
};

/**
 * Открытие модалки
 */
CartQuickCheckout.prototype.openModal = function ($modal) {
  var self = this;

  $modal.css({
    position: 'fixed',
    display: 'block',
  });
  $('body').append(self.$overlay);

  return;
};

/**
 * Закрытие модалки
 */
CartQuickCheckout.prototype.closeModal = function ($modal) {
  var self = this;

  $modal.removeAttr('style');
  self.$overlay.remove();
  self._targetForm._quickCheckout;

  return;
};

/**
 * Запуск добавления товаров, отправка формы
 */
CartQuickCheckout.prototype.send = function () {
  var self = this;
  var items;

  if (!self._targetForm._quickCheckout) {
    self._targetForm._quickCheckout = true;

    items = self._owner.ui._parseProductForm(self._targetForm, self._targetButton);
    self._owner.add_checkout(items);
  } else {
    console.log('QuickCheckout: in process');
    self._send();
  }

  return;
};

/**
 * Обработчик открытия модалки
 */
CartQuickCheckout.prototype._bindOpenModal = function () {
  var self = this;

  $(document).on('click', '[data-quick-checkout]', function (event) {
    event.preventDefault();
    event.stopPropagation();

    var $button = $(this);

    if (!$button.prop(self.selectors.disabled)) {
      // если кнопка не заблочена - показваем модалку
      self._targetForm = self._getProductForm($button);
      self._targetButton = $button;

      self.openModal(self.$modal);
      self.$form.find('input:visible:first').focus();
    } else {
      // иначе - дергаем событие
      EventBus.publish('add_disabled:insales:quick_checkout', {
        button: $button,
      });
    }
  });

  return;
};

/**
 * Отправка формы из модалки
 */
CartQuickCheckout.prototype._send = function () {
  var self = this;
  var ajaxParams = {};
  var task = {
    action: {
      method: 'send',
      modal: self.$modal,
      form: self.$form
    }
  };

  if (self.$form.find(':file').length && window.FormData) {
    ajaxParams.data = new FormData(self.$form.get(0));
    ajaxParams.processData = false;
  } else {
    ajaxParams.data = self.$form.serialize();
  }

  self.$errors.html('');

  EventBus.publish('before:insales:quick_checkout', task);

  ajax.quick(ajaxParams)
    .done(function (response) {
      _.merge(task, response);
      self._success(task);
    })
    .fail(function (response) {
      _.merge(task, response)
      self._errors(task);
    })
    .always(function () {
      EventBus.publish('always:insales:quick_checkout', task)
    });
};

/**
 * Все ок
 */
CartQuickCheckout.prototype._success = function (task) {
  var self = this;

  self._owner.clear();

  self.showMessage(task.message);

  EventBus.publish('success:insales:quick_checkout', task);
  return;
};

/**
 * Прилетели ошибки
 */
CartQuickCheckout.prototype._errors = function (task) {
  var self = this;

  _.forEach(task.errors, function (error) {
    self.$errors.append($('<div class="m-modal-error">'+ error +'</div>'));
  });

  EventBus.publish('errors:insales:quick_checkout', task);

  return;
};

/**
 * Обработчики закрытия модалки
 */
CartQuickCheckout.prototype._bindCloseModal = function () {
  var self = this;

  self.$close
    .off('click')
    .on('click', function (event) {
      _close();
    });

  $(document)
    .on('click', '.m-overlay', function (event) {
      _close();
    })
    .on('keyup', function (event) {
      if (event.keyCode == 27) {
        event.preventDefault();

        _close();
      }
    });

  function _close () {
    event.preventDefault();

    self._targetForm = {};
    self._targetButton = {};
    self.closeModal($('.m-modal'));
    self.$errors.html('');
  }

  return;
};

/**
 * Обработка отправки
 */
CartQuickCheckout.prototype._bindSend = function () {
  var self = this;

  self.$send
    // сносим все обработчики
    .off('click')
    // вешаем свой
    .on('click', function (event) {
      event.preventDefault();

      self.send();
    });

  self.$form
    .on('keypress', function (event) {
      if (event.keyCode == 13) {
        event.preventDefault();
        self.send();
      }
    });

  return;
};

/**
 * Разбор формы модалки
 */
CartQuickCheckout.prototype._getProductForm = function ($button) {
  var self = this;
  var _target = $button.attr(self.selectors.open) || false;
  var _parent = $button.parents('form:first') || false;
  var $form;

  if (_target && $(_target).is('form')) {
    $form = $(_target);
  } else if (_parent && $(_parent).is('form')) {
    $form = $(_parent);
  } else {
    console.log('CartQuickCheckout: _getProductForm: target form: WAAAAT?!');
  }

  return $form;
};

/**
 * Прибиваем слушателей шины
 */
CartQuickCheckout.prototype._bindEvents = function () {
  var self = this;

  EventBus.subscribe('add_checkout:insales:cart', function (data) {
    self._send();
  });
};

/**
 *
 */
CartQuickCheckout.prototype.showMessage = function (message) {
  var self = this;

  self.closeModal(self.$modal);

  self.openModal(self.$message);
  $('.m-modal-msg', self.$message).html(message);
};

/**
 *
 */
CartQuickCheckout.prototype.hideMessage = function () {
  var self = this;

  self.closeModal(self.$message);
};

module.exports = CartQuickCheckout;