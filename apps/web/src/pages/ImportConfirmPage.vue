<template>
  <section>
    <header class="page-header">
      <div>
        <h1>导入确认</h1>
        <p>检查自动识别的书名、作者和章节预览，确认后写入 D1 与 R2。</p>
      </div>
    </header>

    <form class="panel">
      <label>
        书名
        <input class="text-input" value="待识别小说" />
      </label>
      <label>
        作者
        <input class="text-input" value="未知作者" />
      </label>
      <button class="button" type="button">确认导入</button>
    </form>
  </section>
</template>
