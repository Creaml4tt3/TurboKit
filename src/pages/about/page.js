(async () => {
  // data store
  window.store = {
    yourData: "put your data here!",
  };
  // i18n
  window.i18n = import.meta.globEager("./i18n/*.json");
  // setup i18n/lazyload/store...
  await import("@/util/shared");

  // just an example to simulate network request
  // todo: delete below it's just to show skeleton placeholder + remove todo in util/shared.js
  setTimeout(() => {
    window.store.cards = window.store.i18n.body.cards;
  }, 2000);

  // welcome message
  console.log("⚡ TurboKit ⚡");
})();
