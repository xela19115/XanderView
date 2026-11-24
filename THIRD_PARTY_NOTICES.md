# Third-party notices

The root MIT licence covers CleanFrame's original code and documentation. Third-party material retains the terms below. Keep these notices and the adjacent licence texts when sharing source or a build.

## Fonts

| Material | Terms and source record |
| --- | --- |
| Manrope | SIL Open Font License 1.1; `app/assets/manrope-OFL.txt` |
| Geist and Newsreader | SIL Open Font License 1.1; licences beside the files in `app/assets/fonts/`, with exact sources and hashes in `app/assets/fonts/SOURCES.json` |
| Google Sans | SIL Open Font License 1.1; original variable font, licence and trademark notice from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/googlesans), retained in `app/assets/fonts/googlesans/`; exact sources and hashes in `app/assets/fonts/SOURCES.json` |
| Optional PP Neue Montreal, PP Mori and PP Pangram Sans | Proprietary. Binaries stay in ignored `.local/` storage and are excluded from Git and public exports. The optional local overlay requires the user's own permission to use and embed those files. |

The public app uses Manrope, Geist, Newsreader and Google Sans. A personal widget containing proprietary fonts must stay private. See [Pangram's licensing information](https://pangrampangram.com/pages/eula).

## Icons and trademarks

| Material | Provenance and terms |
| --- | --- |
| Simple Icons service marks | CC0; exact revisions and adaptations in `app/assets/icons/SOURCES.json` and `ADDITIONAL-SOURCES.json`. The CC0 text is retained beside the icons. |
| Disney+, ABC and SBS marks | [Custom Brand Icons](https://github.com/elax46/custom-brand-icons), MIT. The retained licence is `app/assets/icons/CUSTOM-BRAND-ICONS-LICENSE.txt`. ABC and SBS sources were replaced during the public-source review. Exact revisions, source files and extraction/recolour notes are in `SOURCES.json`. |
| Art, apps, settings and home outlines | Original CleanFrame drawings, covered by the project's MIT licence. |

Brand marks identify services. Their owners retain trademark rights; this project claims no endorsement or affiliation. The older Australian TV icon archive's GPL text is retained for historical provenance only; no current icon uses that archive.

## Photographs and derived materials

The fifteen photo pages were individually checked on 20 October 2026. Each displayed its credited author and free use under the [Unsplash License](https://unsplash.com/license). The [asset source register](docs/asset-sources.md) links every page. Runtime paths are in `app/assets/wallpapers/SOURCES.json`.

Photographers retain their rights. Wallpapers, thumbnails, panel backgrounds and material fields derive from the credited photographs and retain their terms. The Unsplash licence permits copying, modification and distribution subject to its restrictions, including on selling unmodified images and building a competing image service.

## Development dependencies and exports

Development dependencies retain the licences in their npm packages. They are not copied into the TV JavaScript runtime.

`npm run export:public` excludes private fonts and includes this notice and the root MIT licence. Preserve the included font and icon licence texts. Review [public release preparation](docs/public-release.md) before publishing a repository or download.

## Weather and location data

The optional weather widget retrieves forecasts from [Open-Meteo](https://open-meteo.com/) and location search results from its [GeoNames-backed geocoding API](https://open-meteo.com/en/docs/geocoding-api). Weather data is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); location data is attributed to [GeoNames](https://www.geonames.org/). Attribution is displayed in the widget and its Settings screen. The bundled source contains no fixed personal weather location, API key or account token. Weather icons are original simple SVG line drawings in the launcher.
