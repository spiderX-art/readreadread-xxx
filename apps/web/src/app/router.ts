import { createRouter, createWebHistory } from "vue-router";
import AuthPage from "../pages/AuthPage.vue";
import BookDetailPage from "../pages/BookDetailPage.vue";
import BookSearchPage from "../pages/BookSearchPage.vue";
import BookshelfPage from "../pages/BookshelfPage.vue";
import ImportConfirmPage from "../pages/ImportConfirmPage.vue";
import NetdiskScanPage from "../pages/NetdiskScanPage.vue";
import ReaderPage from "../pages/ReaderPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/books"
    },
    {
      path: "/auth",
      name: "auth",
      component: AuthPage
    },
    {
      path: "/netdisk",
      name: "netdisk",
      component: NetdiskScanPage
    },
    {
      path: "/import/confirm",
      name: "import-confirm",
      component: ImportConfirmPage
    },
    {
      path: "/books",
      name: "bookshelf",
      component: BookshelfPage
    },
    {
      path: "/books/:bookId",
      name: "book-detail",
      component: BookDetailPage
    },
    {
      path: "/books/:bookId/read/:chapterId?",
      name: "reader",
      component: ReaderPage
    },
    {
      path: "/books/:bookId/search",
      name: "book-search",
      component: BookSearchPage
    }
  ]
});
