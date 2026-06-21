<template>
  <div class="app-shell">
    <aside class="side-nav" aria-label="主导航">
      <RouterLink class="brand" to="/books">
        <span class="brand-mark">阅</span>
        <span>
          <strong>私人书架</strong>
          <small>Cloud Reader</small>
        </span>
      </RouterLink>

      <nav class="nav-links">
        <RouterLink to="/books">书架</RouterLink>
        <RouterLink to="/netdisk">网盘</RouterLink>
        <RouterLink to="/import/confirm">导入</RouterLink>
        <RouterLink to="/auth">授权</RouterLink>
      </nav>
    </aside>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>
