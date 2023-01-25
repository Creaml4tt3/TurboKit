// ============================================
//                🗃 Imports
// ============================================
"use strict";
import {
  readFileSync,
  writeFileSync,
  renameSync,
  statSync,
  readdirSync,
  rmdirSync,
} from "fs";
import path from "path";
// utils
import gulp from "gulp";
import runSequence from "gulp4-run-sequence";
import del from "del";
import shell from "gulp-shell";
import glob from "glob";
import tap from "gulp-tap";
import each from "gulp-each";
import replace from "gulp-replace";
import rename from "gulp-rename";
import prettier from "prettier";
// js
import uglify from "gulp-uglify-es";
import { generateSW } from "workbox-build";
import javascriptObfuscator from "gulp-javascript-obfuscator";
// html
import htmlmin from "gulp-htmlmin";
import realFavicon from "gulp-real-favicon";
import gulpSeo from "gulp-seo";
import inlineSource from "gulp-inline-source-html";
import lqipBase64 from "gulp-lqip-base64";
import posthtml from "gulp-posthtml";
import transform from "posthtml-transform";
// css
import critical from "critical";
import postcss from "gulp-postcss";
import autoprefixer from "autoprefixer";
import cleanCSS from "gulp-clean-css";
// json
import jsonminify from "gulp-jsonminify";
import embedJSON from "gulp-embed-json";
// images
import imagemin, { gifsicle, mozjpeg, optipng, svgo } from "gulp-imagemin";
import imageminAvif from "imagemin-avif";
import imageminWebp from "imagemin-webp";
import responsive from "gulp-responsive";
import imgsizefix from "gulp-imgsizefix";
// import imageminGuetzli from "imagemin-guetzli"; // add to package.json before using
// font
import gfont from "goog-webfont-dl";
// hash
import rev from "gulp-rev";
import revdel from "gulp-rev-delete-original";
import revRewrite from "gulp-rev-rewrite";
// xml
import sitemap from "gulp-sitemap";
// gzip
import gulpWebCompress from "gulp-web-compress";

// ============================================
//                🛠 Config
// ============================================
const config = {
  // todo: customize this
  siteName: "TuboKit", // change this
  siteUrl: "https://turbokit.netlify.app/", // change this
  windowsColor: "#000000",
  androidColor: "#ffffff",
  safariColor: "#f0bd66",
  orientation: "portrait",
  sourceLogo: "./config/logo.svg",
  // build
  output: "dist",
  input: "src",
  obfuscateJS: false,
  // dev
  port: 3000,
  // images generation
  resizeTo: (format) => [
    {
      width: 3840,
      rename: {
        prefix: "3840-",
        extname: `.${format}`,
      },
      format,
    },
    {
      width: 3440,
      rename: {
        prefix: "3440-",
        extname: `.${format}`,
      },
      format,
    },
    {
      width: 2560,
      rename: {
        prefix: "2560-",
        extname: `.${format}`,
      },
      format,
    },
    {
      width: 1920,
      rename: {
        prefix: "1920-",
        extname: `.${format}`,
      },
      format,
    },
    {
      width: 1600,
      rename: {
        prefix: "1600-",
        extname: `.${format}`,
      },
      format,
    },
    {
      width: 1366,
      rename: {
        prefix: "1366-",
        extname: `.${format}`,
      },
      format,
    },
    {
      width: 1024,
      rename: {
        prefix: "1024-",
        extname: `.${format}`,
      },
      format,
    },
    {
      width: 768,
      rename: {
        prefix: "768-",
        extname: `.${format}`,
      },
      format,
    },
    {
      width: 640,
      rename: {
        prefix: "640-",
        extname: `.${format}`,
      },
      format,
    },
    {
      width: "100%",
      rename: {
        extname: `.${format}`,
      },
      format,
    },
  ],
};

// ============================================
//                ▶ Tasks
// ============================================
gulp.task("default", shell.task("vite --config vite.config.js"));

gulp.task("image", (callback) => {
  console.log(`
    ============================================
               ⚡ TurboKit Images ⚡
    ============================================
    `);
  return runSequence(
    "clean-image",
    //——————————————
    "minify-png",
    "minify-gif",
    "minify-svg",
    "minify-jpg",
    //——————————————
    // 'minify-guetzli', // options: this is super, super slow!!
    "resize-jpg", // resize png/jpg + convert png->jpg
    //——————————————
    "generate-webp",
    "generate-avif",
    callback
  );
});

gulp.task("build", (callback) => {
  console.log(`
    ============================================
                🚀 TurboKit Build 🚀
    ============================================
    `);
  return runSequence(
    // base
    "clean",
    "vite",
    "copy-files", // src -> dist (html/css/js are moved by vite)
    "del-artifacts", // delete build artifacts
    // css
    "prefix-css",
    "minify-css",
    "critical-path",
    // json
    "minify-json",
    "embed-json", // schema.org
    // html
    "sitemap",
    "meta-tags",
    "preload-fonts",
    // "subset-fonts", // todo: scan all charters used and generate a smaller subset of each font
    "inline-svg", // anything with 'inline' attribute not only svgs
    "images-width-height", // todo: build a custom version of this as it doesn't work as intended!!
    "generate-lqip", // base64 images placeholders
    "src-to-srcset",
    "favicon-inject",
    "rel-nofollow", // add rel="nofollow" on <a> tags
    "sw-html", // service worker registration
    "minify-html",
    "del-sourcemaps",
    config.obfuscateJS ? "obfuscate-js" : null, // optional: obfuscate javascript
    "minify-js", // optional: Vite already minifies js
    // "gzip", // optional: compress using brotli and gzip
    // hash
    "hash-rev",
    "links-rev",
    // pwa
    "service-worker",
    // clean
    "del-empty-folders",
    callback
  );
});

// ============================================
//            🚧 First Time Setup
// ============================================
// sitemap for SEO
gulp.task("sitemap", (cb) =>
  gulp
    .src(`${config.output}/**/*.html `, { read: false })
    .pipe(
      sitemap({
        siteUrl: config.siteUrl,
      })
    )
    .pipe(gulp.dest(config.output))
);

// preload woff2 fonts in all html files
gulp.task("preload-fonts", () =>
  gulp
    .src([`${config.output}/**/*.html`])
    .pipe(
      replace(/\<(s*?)head(s*?)\>/, (match) => {
        let finalHTML = `<head>`;
        glob.sync(`${config.output}/font/*.woff2`).forEach((font) => {
          const fontName = font
            .toString()
            .match(/\/[^\/]+[.]woff2/)[0]
            .replace(/\/|[.]woff2/g, "");
          finalHTML += `
<link rel="preload" as="font" href="/font/${fontName}.woff2" type="font/woff2" crossorigin="anonymous" />`;
        });
        return finalHTML;
      })
    )
    .pipe(gulp.dest(config.output))
);

// generate meta tags for SEO
gulp.task("meta-tags", () =>
  gulp
    .src([`${config.output}/**/*.html`])
    .pipe(
      tap(function (file, t) {
        if (file.path.toString().includes("index.html")) {
          const jsonPath = file.path
            .toString()
            .replace("index.html", "config\\meta.json");
          let metaJSON = readFileSync(jsonPath, "utf-8");
          metaJSON = JSON.parse(metaJSON);
          return t.through(gulpSeo, [metaJSON]);
        }
      })
    )
    .pipe(gulp.dest(config.output))
);

// --------------------- fonts start here -----------------------------
// helper function for "font-download" task
// rename fonts: lowercase + add '-rtl' suffix mark RTL fonts
const renameFonts = (font, RTL) =>
  new Promise((resolve) => {
    gulp
      .src(`${config.input}/font/?(*)${font}?(*).*`)
      .pipe(
        each(async (content, file, callback) => {
          const path = file.path.toLowerCase();
          const indexExt = file.path.search(
            /\.((woff)|(woff2)|(ttf)|(eot)|(svg))/
          );
          const newPath =
            path.substring(0, indexExt) +
            (RTL ? "-rtl" : "") +
            path.substring(indexExt);
          renameSync(file.path, newPath);
          callback(null, file);
        })
      )
      .pipe(gulp.dest(`${config.input}/font`))
      .on("end", () => {
        resolve();
      });
  });

// helper function to generate @font-face css for each font
let finalCSS = ``;
const generateFontCSS = (fontName, RTL, fallback) => {
  glob
    .sync(`${config.input}/font/${fontName.toLowerCase()}?(*).ttf`)
    .forEach((font) => {
      let fontWeight = font.toString().match(/[0-9]{3}/);
      fontWeight = fontWeight ? fontWeight : "400";
      const isItalic = !!font.toString().match(/italic/);
      const fontPathAndName = font
        .replace(`${config.input}`, "")
        .replace(".ttf", "");
      finalCSS += `@font-face {
  font-family: "TurboKit${RTL ? "-RTL" : ""}";
  src: url("${fontPathAndName}.woff2") format("woff2"),
    url("${fontPathAndName}.woff") format("woff"),
    url("${fontPathAndName}.ttf") format("truetype");
  font-weight: ${fontWeight};
  font-style: ${isItalic ? "italic" : "normal"};
  font-display: swap;
}
@font-face {
  font-family: "TurboKit-Fallback${RTL ? "-RTL" : ""}";
  font-size: ${
    fallback && fallback["font-size"] ? fallback["font-size"] : "17px"
  };
  line-height: ${
    fallback && fallback["line-height"] ? fallback["line-height"] : "1.5"
  };
  letter-spacing: ${
    fallback && fallback["letter-spacing"]
      ? fallback["letter-spacing"]
      : "-0.55px"
  };
  word-spacing: ${
    fallback && fallback["word-spacing"] ? fallback["word-spacing"] : "-0.15px"
  };
  font-weight: ${fontWeight};
  visibility: visible;
  src: local(${
    fallback && fallback["font-family"] ? fallback["font-family"] : "Verdana"
  });
}
`;
    });
};

// download / rename fonts from google fonts (config/font.json) and inject css to 'shared.css'
gulp.task(
  "font",
  () =>
    new Promise(async (res) => {
      console.log(`
    ============================================
                🖋 TurboKit Font 🖋
    ============================================
    `);
      // clean fonts folder
      await del([`${config.input}/font/**/*.*`]);
      // download + rename fonts listed in `config/font.json` from google fonts
      let fontJSON = readFileSync(`config/font.json`, "utf-8");
      let fonts = JSON.parse(fontJSON);
      const formats = ["ttf", "woff", "woff2"], // eot, svg
        destination = `${config.input}/font`;
      if (fonts.LTR) {
        await Promise.all(
          // download ltr fonts
          Object.keys(fonts.LTR).map(async (font) => {
            await gfont({
              font,
              formats,
              destination,
              subset: fonts.LTR[font].subset, //  e.g. 'latin,latin-ext,arabic,cyrillic'
              styles: fonts.LTR[font].styles.toString(), //  e.g. '300,400,300italic,400italic'
            });
            await renameFonts(font, false);
            generateFontCSS(font, false, fonts.LTR[font].fallback);
            return new Promise((resolve) => resolve(finalCSS));
          })
        );
      }
      if (fonts.RTL) {
        await Promise.all(
          Object.keys(fonts.RTL).map(async (font) => {
            // download rtl fonts
            await gfont({
              font,
              formats,
              destination,
              subset: fonts.RTL[font].subset, //  e.g. 'latin,latin-ext,arabic,cyrillic'
              styles: fonts.RTL[font].styles.toString(), //  e.g. '300,400,300italic,400italic'
            });
            await renameFonts(font, true);
            generateFontCSS(font, true, fonts.RTL[font].fallback);

            return new Promise((resolve) => resolve(finalCSS));
          })
        );
      }
      let css = readFileSync(`${config.input}/util/shared.css`, {
        encoding: "utf8",
      });
      // if there is already @font-face remove it
      css = css.replace(/@font-face[\S\s]*?{[\S\s]*?}/g, "");
      css = css.replace(/\/\*([\s\S]*?)FONTS([\s\S]*?)\*\//g, "");
      // inject new css to "util/shared.css"
      css =
        `/*========================
          FONTS
==========================*/
${finalCSS}
` + css;
      // format css with prettier
      const options = await prettier.resolveConfig("./config/.prettierrc");
      css = prettier.format(css, { ...options, parser: "css" });
      writeFileSync(`${config.input}/util/shared.css`, css);
      // signal end of task
      res();
    })
);
// --------------------- fonts end here -----------------------------

// generate all icons/favicon sizes from your logo
gulp.task("favicon-generate", (cb) => {
  return realFavicon.generateFavicon(
    {
      masterPicture: config.sourceLogo,
      dest: `${config.input}/meta`,
      iconsPath: "/meta",
      manifestMaskable: true,
      design: {
        ios: {
          pictureAspect: "noChange",
          assets: {
            ios6AndPriorIcons: true,
            ios7AndLaterIcons: true,
            precomposedIcons: true,
            declareOnlyDefaultIcon: true,
          },
        },
        desktopBrowser: {
          design: "raw",
        },
        windows: {
          pictureAspect: "noChange",
          backgroundColor: config.windowsColor,
          onConflict: "override",
          assets: {
            windows80Ie10Tile: true,
            windows10Ie11EdgeTiles: {
              small: true,
              medium: true,
              big: true,
              rectangle: true,
            },
          },
        },
        androidChrome: {
          pictureAspect: "noChange",
          themeColor: config.androidColor,
          manifest: {
            name: config.siteName,
            display: "standalone",
            orientation: config.orientation,
            start_url: "/index.html",
            onConflict: "override",
            declared: true,
          },
          assets: {
            legacyIcon: true,
            lowResolutionIcons: true,
          },
        },
        safariPinnedTab: {
          pictureAspect: "silhouette",
          themeColor: config.safariColor,
        },
      },
      settings: {
        scalingAlgorithm: "Mitchell",
        errorOnImageTooSmall: true,
        readmeFile: false,
        htmlCodeFile: false,
        usePathAsIs: false,
      },
      markupFile: "config/temp/favicon.json",
    },
    () => {
      // Add support for maskable icon
      const manifest = JSON.parse(
        readFileSync(`${config.input}/meta/site.webmanifest`)
      );
      if (manifest && manifest.icons) {
        manifest.icons.forEach((icon) => {
          icon.purpose = "any maskable";
        });
      }
      writeFileSync(
        `${config.input}/meta/site.webmanifest`,
        JSON.stringify(manifest)
      );
      cb();
    }
  );
});

// inject the favicon markups in your HTML pages.
gulp.task("favicon-inject", () =>
  gulp
    .src([`${config.output}/**/*.html`])
    .pipe(
      realFavicon.injectFaviconMarkups(
        JSON.parse(readFileSync("./config/temp/favicon.json")).favicon.html_code
      )
    )
    .pipe(gulp.dest(config.output))
);

// check if favicons needs an update (in case new icons sizes are needed)
gulp.task("favicon-update", (done) =>
  realFavicon.checkForUpdates(
    JSON.parse(readFileSync("config/temp/favicon.json")).version
  )
);

// ============================================
//             ⚡ Lighthouse Test
// ============================================
gulp.task("lh-note", (cb) => {
  console.log(`
    - Lighthouse test started, please wait...
    - configure: change '.lighthouserc.json' and 'budget.json'
    - results: check the '.lighthouseci' folder
    - it's normal if the script exits with a code 1 failure
  `);
  cb();
});

gulp.task(
  "lh-local",
  shell.task(
    `lhci autorun --config=config/lighthouserc.json --collect.staticDistDir=${config.output}`
  )
);

gulp.task("lighthouse-local", () => {
  return runSequence("lh-note", "lh-local");
});

gulp.task(
  "lh-live",
  shell.task(
    `lhci autorun --config=config/lighthouserc.json --collect.url=${config.siteUrl}`
  )
);

gulp.task("lighthouse-live", () => {
  return runSequence("lh-note", "lh-live");
});

// prettier formatting
gulp.task(
  "prettier",
  shell.task(
    `prettier "src/{,!(lib|audio|font|img|video)/**/}*.!(png|jpg|svg|xml|ico|mp3|mp4)" --write --config ./config/.prettierrc`
  )
);

// ============================================
//             🏗 Image Scripts
// ============================================
gulp.task("clean-image", () => del([`img`]));

gulp.task("minify-png", () =>
  gulp
    .src([`${config.input}/img/**/*.png`])
    .pipe(imagemin([optipng()]))
    .pipe(gulp.dest(`img`))
);

gulp.task("minify-gif", () =>
  gulp
    .src([`${config.input}/img/**/*.gif`])
    .pipe(imagemin([gifsicle()]))
    .pipe(gulp.dest(`img`))
);

gulp.task("minify-svg", () =>
  gulp
    .src([`${config.input}/img/**/*.svg`])
    .pipe(
      imagemin([
        svgo({
          plugins: [{ name: "removeViewBox", active: false }],
        }),
      ])
    )
    .pipe(gulp.dest(`img`))
);

// basic jpg minification + rename jpeg to jpg
gulp.task("minify-jpg", () =>
  gulp
    .src([`${config.input}/img/**/*.{jpeg,jpg}`])
    .pipe(imagemin([mozjpeg()]))
    .pipe(rename({ extname: ".jpg" }))
    .pipe(gulp.dest(`img`))
);

// notice: guetzli is super slow!!! don't use it unless you really need to
gulp.task("minify-guetzli", () =>
  gulp
    .src([`img/**/*.{jpg,png}`])
    .pipe(
      imagemin([
        imageminGuetzli({
          nomemlimit: true,
        }),
      ])
    )
    .on("error", (err) => {
      console.log(err.message);
    })
    .pipe(rename({ extname: ".jpg" }))
    .pipe(gulp.dest(`img`))
);

// generate resized images + convert png -> jpg
gulp.task("resize-jpg", () =>
  gulp
    .src([`img/**/*.{jpg,jpeg,png}`])
    .pipe(
      responsive(
        {
          "**/*": config.resizeTo("jpg"),
        },
        {
          progressive: true,
          withMetadata: false,
          errorOnUnusedConfig: false,
          errorOnUnusedImage: false,
          errorOnEnlargement: false,
        }
      )
    )
    .pipe(gulp.dest(`img`))
);

gulp.task("generate-webp", () =>
  gulp
    .src([`img/**/*.jpg`])
    .pipe(
      imagemin([
        imageminWebp({
          method: 6,
        }),
      ])
    )
    .on("error", (err) => {
      console.log(err.message);
    })
    .pipe(rename({ extname: ".webp" }))
    .pipe(gulp.dest(`img`))
);

gulp.task("generate-avif", () =>
  gulp
    .src([`img/**/*.jpg`])
    .pipe(imagemin([imageminAvif({ quality: 50 })]))
    .on("error", (err) => {
      console.log(err.message);
    })
    .pipe(rename({ extname: ".avif" }))
    .pipe(gulp.dest(`img`))
);

// ============================================
//              🚀 Build Scripts
// ============================================

gulp.task("clean", () => del([`dist`]));

gulp.task("vite", shell.task("vite build --config vite.config.js"));

gulp.task("copy-files", () =>
  gulp
    .src([
      // copy src folder to dist
      `./*img/**/*`, // prod images
      `${config.input}/pages/index/**/*.json`,
      `${config.input}/pages/**/*.json`, // i18n files
      `${config.output}/index/index.html`,
    ])
    .pipe(gulp.dest(config.output))
);

// remove unnecessary build folders
gulp.task("del-artifacts", () =>
  del([
    `${config.output}/index`,
    `${config.output}/pages`,
    `${config.output}/util`,
  ])
);

// remove empty folders
gulp.task("del-empty-folders", function (cb) {
  const cleanEmptyFoldersRecursively = (folder) => {
    const isDir = statSync(folder).isDirectory();
    if (!isDir) return;
    let files = readdirSync(folder);
    if (files.length > 0) {
      files.forEach((file) =>
        cleanEmptyFoldersRecursively(path.join(folder, file))
      );
      files = readdirSync(folder);
    }
    if (files.length === 0) {
      rmdirSync(folder);
    }
  };
  cleanEmptyFoldersRecursively(`${config.output}`);
  cb();
});

// gzip
gulp.task("gzip", () =>
  gulp
    .src([`${config.output}/**/*.*`])
    .pipe(gulpWebCompress())
    .pipe(gulp.dest(config.output))
);

// delete any source maps files
gulp.task("del-sourcemaps", () =>
  del([`${config.output}/**/*.js.map`, `${config.output}/**/*.css.map`])
);

// ================================================ HTML ===============================================================

gulp.task("src-to-srcset", () =>
  gulp
    .src([`${config.output}/**/*.html`])
    .pipe(
      replace(/<img[\s\S]*?(data-src|src)[\s\S]*?(>|\/>)/g, (match) => {
        let filePathFull = match.match(
          /(data-src|src)=("|\s)?([\s\S]*?)(("|\s)+|(>))/
        );
        filePathFull =
          filePathFull && filePathFull.length
            ? filePathFull[0].toString().trim()
            : "";
        const isLazyLoaded = filePathFull.toString().includes("data-src");
        let fileExt = filePathFull.match(/\.((png)|(gif)|(jpg)|(jpeg))/);
        fileExt = fileExt && fileExt.length ? fileExt[0].toString().trim() : "";
        const filePathWithName = filePathFull
          .replace(fileExt, "")
          .replace(/(data-src=|src=)/g, "")
          .replace(/[<>"']/g, "");
        let filePathOnly = filePathWithName.match(/.*?img\//);
        filePathOnly =
          filePathOnly && filePathOnly.length
            ? filePathOnly[0].toString().trim()
            : "";
        const fileNameOnly = filePathWithName.replace(/.*?img\//, "");
        const fileType = fileExt.replace(/[.]/g, "").toLowerCase();
        if (fileType === "gif" || fileType === "svg") {
          return `${match}`.trim();
        } else {
          return `
            <source type="image/avif" ${
              isLazyLoaded ? "data-srcset" : "srcset"
            }="
                ${filePathOnly}768-${fileNameOnly}.avif 768w,
                ${filePathOnly}640-${fileNameOnly}.avif 640w,
                ${filePathOnly}1024-${fileNameOnly}.avif 1024w,
                ${filePathOnly}1366-${fileNameOnly}.avif 1366w,
                ${filePathOnly}1600-${fileNameOnly}.avif 1600w,
                ${filePathOnly}1920-${fileNameOnly}.avif 1920w,
                ${filePathOnly}2560-${fileNameOnly}.avif 2560w,
                ${filePathOnly}3440-${fileNameOnly}.avif 3440w,
                ${filePathOnly}3840-${fileNameOnly}.avif 3840w">
            <source type="image/webp" ${
              isLazyLoaded ? "data-srcset" : "srcset"
            }="
                ${filePathOnly}768-${fileNameOnly}.webp 768w,
                ${filePathOnly}640-${fileNameOnly}.webp 640w,
                ${filePathOnly}1024-${fileNameOnly}.webp 1024w,
                ${filePathOnly}1366-${fileNameOnly}.webp 1366w,
                ${filePathOnly}1600-${fileNameOnly}.webp 1600w,
                ${filePathOnly}1920-${fileNameOnly}.webp 1920w,
                ${filePathOnly}2560-${fileNameOnly}.webp 2560w,
                ${filePathOnly}3440-${fileNameOnly}.webp 3440w,
                ${filePathOnly}3840-${fileNameOnly}.webp 3840w">
            <source type="image/${fileType}" ${
            isLazyLoaded ? "data-srcset" : "srcset"
          }="
                ${filePathOnly}640-${fileNameOnly}.${fileType} 640w,
                ${filePathOnly}768-${fileNameOnly}.${fileType} 768w,
                ${filePathOnly}1024-${fileNameOnly}.${fileType} 1024w,
                ${filePathOnly}1366-${fileNameOnly}.${fileType} 1366w,
                ${filePathOnly}1600-${fileNameOnly}.${fileType} 1600w,
                ${filePathOnly}1920-${fileNameOnly}.${fileType} 1920w,
                ${filePathOnly}2560-${fileNameOnly}.${fileType} 2560w,
                ${filePathOnly}3440-${fileNameOnly}.${fileType} 3440w,
                ${filePathOnly}3840-${fileNameOnly}.${fileType} 3840w">
            ${match}
            `.trim();
        }
      })
    )
    .pipe(gulp.dest(config.output))
);

gulp.task("minify-html", () =>
  gulp
    .src(`${config.output}/**/*.html`)
    .pipe(
      htmlmin({
        collapseWhitespace: true,
        removeComments: true,
        removeAttributeQuotes: true,
        removeRedundantAttributes: true,
      })
    )
    .pipe(gulp.dest(config.output))
);

gulp.task("rel-nofollow", () =>
  gulp
    .src(`${config.output}/**/*.html`)
    .pipe(
      posthtml([
        transform([
          { selector: "a", attr: "rel", value: "noopener noreferrer nofollow" },
        ]),
      ])
    )
    .pipe(gulp.dest(config.output))
);

gulp.task("images-width-height", () =>
  gulp
    .src(`${config.output}/**/*.html`)
    .pipe(
      imgsizefix({
        paths: {
          [config.output]: [new RegExp("^\\/")],
        },
      })
    )
    .pipe(gulp.dest(config.output))
);

gulp.task("inline-svg", (cb) =>
  gulp
    .src(`${config.output}/**/*.html`)
    .pipe(inlineSource())
    .pipe(gulp.dest(config.output))
    .on("end", async () => {
      await del(`${config.output}/**/config`);
    })
);

gulp.task("generate-lqip", () =>
  gulp
    .src(`${config.output}/**/*.html`)
    .pipe(
      lqipBase64({
        srcAttr: "data-src",
        attribute: "src",
      })
    )
    .pipe(gulp.dest(config.output))
    .on("end", () => {
      // remove src=""
    })
);

// ================================================ CSS ================================================================

gulp.task("prefix-css", () =>
  gulp
    .src([`${config.output}/assets/**/*.css`])
    .pipe(postcss([autoprefixer()]))
    .pipe(gulp.dest(`${config.output}/assets`))
);

gulp.task("minify-css", () =>
  gulp
    .src(`${config.output}/**/*.css`)
    .pipe(
      cleanCSS({
        level: {
          2: { restructureRules: true },
        },
      })
    )
    .pipe(gulp.dest(config.output))
);

// ================================================ JSON ===============================================================

gulp.task("minify-json", () =>
  gulp
    .src(`${config.output}/**/*.json`)
    .pipe(jsonminify())
    .pipe(gulp.dest(config.output))
);

gulp.task("embed-json", () =>
  gulp
    .src(`${config.output}/**/*.html`)
    .pipe(
      embedJSON({
        root: config.output,
        mimeTypes: "application/ld+json",
      })
    )
    .pipe(gulp.dest(config.output))
);

// ================================================= JS ================================================================

gulp.task("minify-js", (cb) =>
  gulp
    .src([`${config.output}/**/*.js`])
    .pipe(
      uglify.default({
        mangle: {
          reserved: ["fetch"],
        },
      })
    )
    .pipe(gulp.dest(config.output))
);

gulp.task("sw-html", () =>
  gulp
    .src([`${config.output}/**/*.html`])
    .pipe(
      replace(/<\/body[\s\S]*?>/g, (match) => {
        return `</body><script defer async>"serviceWorker" in navigator ? navigator.serviceWorker.register("/sw.js") : console.warn("ServiceWorkers are not supported");</script>`;
      })
    )
    .pipe(gulp.dest(config.output))
);

gulp.task(
  "service-worker",
  () =>
    new Promise((resolve) => {
      generateSW({
        globDirectory: config.output,
        globPatterns: ["**/*.*"],
        globIgnores: ["**/*.{webp,png,jpg,jpeg,png,avif,mp4,ico,html}", "/"],
        runtimeCaching: [
          {
            urlPattern: /\.(?:webp|png|jpg|jpeg|png|avif|mp4)$/,
            handler: "CacheFirst",
          },
          {
            urlPattern: /\.(?:html)$/,
            handler: "NetworkFirst",
          },
        ],
        swDest: `${config.output}/sw.js`,
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        inlineWorkboxRuntime: true,
        sourcemap: false,
      })
        .then(({ warnings }) => {
          for (const warning of warnings) {
            console.warn(warning);
          }
          console.info("Service worker generation completed.");
          // hash service worker file
          gulp
            .src(`${config.output}/sw.js`)
            .pipe(rev())
            .pipe(gulp.src(`${config.output}/**/*.{html,js,css,webmanifest}`))
            .pipe(revRewrite())
            .pipe(gulp.dest(`${config.output}`))
            .on("end", () =>
              del([`${config.output}/sw.js`]).then(() => resolve())
            );
        })
        .catch((error) => {
          console.warn("Service worker generation failed:", error);
        });
    })
);

// ================================================= Hashing ===========================================================

// Static asset revisioning by appending content hash to filenames
gulp.task("hash-rev", () =>
  gulp
    .src([
      `${config.output}/**/*.*`,
      `!${config.output}/**/assets/*.*`,
      `!${config.output}/**/sw-?(*).js`,
      `!${config.output}/**/index?(-*).html`,
      `!${config.output}/sitemap.xml`,
    ])
    .pipe(
      rev({
        path: "config/temp/rev-manifest.json",
      })
    )
    .pipe(
      revdel({
        oldManifest: "config/temp/rev-manifest.json",
      })
    )
    .pipe(gulp.dest(config.output))
    .pipe(rev.manifest())
    .pipe(gulp.dest("./config/temp"))
);

gulp.task("links-rev", () =>
  gulp
    .src([`${config.output}/**/*.{html,js,css,webmanifest}`])
    .pipe(
      revRewrite({
        manifest: readFileSync("config/temp/rev-manifest.json"),
        modifyUnreved: replaceAbsolutePaths,
        modifyReved: replaceAbsolutePaths,
      })
    )
    .pipe(gulp.dest(config.output))
);

// obfuscate(make it unreadable) javascript
gulp.task("obfuscate-js", () => {
  const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    randomPrefix = [...Array(5)]
      .map((_) => c[~~(Math.random() * c.length)])
      .join("");
  return gulp
    .src([`${config.output}/*.js`])
    .pipe(
      javascriptObfuscator({
        stringArrayEncoding: ["base64"],
        identifiersPrefix: randomPrefix,
        splitStrings: true,
      })
    )
    .pipe(gulp.dest(config.output));
});

gulp.task("critical-path", () =>
  gulp
    .src([`${config.output}/**/*.html`])
    .pipe(
      each(async (content, file, callback) => {
        await critical.generate(
          {
            src: `${file.relative}`,
            base: `${config.output}/`,
            inline: true,
          },
          (err) => {
            callback(err, file);
          }
        );
      })
    )
    .pipe(gulp.dest(config.output))
);

const replaceAbsolutePaths = (filename) => {
  if (filename.includes("/")) {
    return filename.substring(filename.lastIndexOf("/") + 1);
  }
  return filename;
};
