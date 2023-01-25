import tinybind from "tinybind";
import yall from "yall-js";

(async () => {
  // ————————— helpers —————————
  window.$ = (_) => {
    const doms = document.querySelectorAll(_);
    return doms && doms.length > 1 ? doms : doms[0];
  };

  // ————————— i18n —————————
  Object.keys(window.i18n).forEach((key) => {
    window.i18n[
      key
        .match(/i18n\/[A-Za-z]{2}/)[0]
        .replace(/i18n\//g, "")
        .toLowerCase()
    ] = window.i18n[key].default;
    delete window.i18n[key];
  });

  // find preferred language
  window.lang = (
    localStorage.getItem("lang") ||
    (navigator.userLanguage || navigator.language).split("-")[0] ||
    "en"
  ).toLowerCase();
  // rtl / ltr
  const direction = () =>
    window.document.body.setAttribute(
      "dir",
      window.lang === "ar" ? "rtl" : "ltr"
    );
  direction();
  // bind to store
  window.store.i18n = i18n[window.lang];
  // language changer
  const langInput = $("#lang");
  if (langInput) {
    langInput.value = window.lang;
    langInput.addEventListener("change", (event) => {
      localStorage.setItem("lang", event.target.value);
      window.lang = event.target.value;
      window.store.i18n = window.i18n[window.lang];
      direction();

      // todo: delete line below (just for the demo example)
      window.store.cards = window.store.i18n.body.cards;
    });
  }

  // ————————— lazyload —————————
  document.addEventListener(
    "DOMContentLoaded",
    yall({
      lazyClass: "picture,img,video,iframe",
      noPolyfill: false,
    })
  );

  // ————————— tinybind —————————
  tinybind.configure({
    prefix: "v",
  });
  tinybind.bind(window.document.body, window.store); // bind store to html
})();
