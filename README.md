# Gojo School

`UI-template/template1.html` is the interactive workspace for Gojo Institute in Sinkor and Paynesville, Monrovia. A headteacher opens the school day: attendance, uncovered bell slots, admissions still open, LRD bills with an optional USD equivalent, and parent matters. The campus runs from early childhood (Nursery, ABC, K1, K2) through Grade 12. The year is Period 1 through Period 6. The bell is 1st Period through 8th Period. Fees are in LRD.

Open that file in a browser to click through the sample. The Vite app in `src/` is the school shell. Start it on port 5174 so it matches the API cookie and CSRF setup:

```bash
npm run dev -- --port 5174
```

The API is the Django app in `lib_school_management_system`. Run that server on port 7000. The Vite dev server proxies `/api` to `http://127.0.0.1:7000`.

```bash
python manage.py runserver 7000
```

`python manage.py seed_gojo_demo` creates the staff logins below when `DEBUG` is true. They share the password in `SEED_GOJO_PASSWORD` (`local-dev-only` in the local `.env`).

| Email | Name | Role |
|---|---|---|
| `samuel.kollie@gojo.test` | Dr. Samuel Kollie | Principal |
| `beatrice.toe@gojo.test` | Beatrice Toe | Registrar |
| `joseph.freeman@gojo.test` | Joseph Freeman | Bursar |
| `grace.johnson@gojo.test` | Grace Johnson | Teacher |

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
