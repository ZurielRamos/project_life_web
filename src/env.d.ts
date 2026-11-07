/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    /** Tienda resuelta por host, o null en el sitio principal. */
    store: import('./lib/store').StoreConfig | null;
  }
}
