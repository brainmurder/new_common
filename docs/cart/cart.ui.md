# Связка DOM с корзиной ISnew.Cart

Для упрощения разработки сделана отдельная сущность ISnew.CartDOM(), представляющая из себя инструмент для автоматической привязки элементов верстки с соответствующим функционалом корзины.

Её особенности

* привязана к атрибутам.
* блокировка повторных действий с DOM-объектами до выполнения текущей задачи. Нельзя сделать пересчет корзины, пока текущая задача не разрешится с любым результатом (`always:insales:cart`).
* динамическая привязка к верстке. Можно динамически создавать элементы верстки без необходимости заново вешать все события.
* автоматическое приведение данных в формах в валидный внутренний вид

## Атрибуты-указатели

* `cart-item-add` - помечает, что данный DOM-узел - кнопка добавления варианта/вариантов товара в корзину
* `cart-item-delete` - данный DOM-узел - кнопка удаления позиции из корзины
* `cart-form` - форма со всеми позициями корзины (в шаблоне корзины cart.liquid)
* `cart-form-submit` - кнопка оформления заказа
* `cart-form-clear` - кнопка отвечает за полную очистку корзины
* `cart-coupon-submit` - кнопка "отправить купон"

## Публичные методы